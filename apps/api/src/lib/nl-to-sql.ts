import { GoogleGenAI, Type } from "@google/genai";
import type { SemanticLayer } from "@vizzly-sa/shared";
import { AppError } from "../errors";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface NLSQLResult {
  sql: string;
  explanation: string;
}

export async function generateSQL(
  question: string, 
  layer: SemanticLayer,
  dateRange?: { from: string; to: string },
  previousError?: string, // R3 FIX: Accept the error for self-correction
  previousSql?: string    // R3 FIX: Accept the bad SQL
): Promise<NLSQLResult> {

  // S10 FIX: Strip out sensitive columns before sending to the AI
  const safeLayer = {
    ...layer,
    tables: layer.tables.map(table => ({
      ...table,
      columns: table.columns.filter(col => !col.isSensitive)
    }))
  };

  // R2 FIX: Only send tables that are relevant to the question
  const questionLower = question.toLowerCase();
  const questionWords = questionLower.split(/\s+/).filter(w => w.length > 3);

  const relevantTables = safeLayer.tables.filter(table => {
    const tableNameLower = table.name.toLowerCase();
    const tableDescLower = table.description.toLowerCase();
    
    if (questionWords.some(w => tableNameLower.includes(w) || tableDescLower.includes(w))) {
      return true;
    }
    
    return table.columns.some(col => {
      const colLower = col.name.toLowerCase();
      const descLower = col.description.toLowerCase();
      return questionWords.some(w => colLower.includes(w) || descLower.includes(w));
    });
  });

  const tablesToSend = relevantTables.length > 0 ? relevantTables : safeLayer.tables;
  const schemaPrompt = JSON.stringify(tablesToSend, null, 2);

  const metricsPrompt = safeLayer.metrics && safeLayer.metrics.length > 0 
    ? JSON.stringify(safeLayer.metrics, null, 2) 
    : "No custom metrics defined.";

  const dateInstruction = dateRange 
    ? `IMPORTANT: The user has selected a date range. You MUST add a WHERE clause filtering the main timestamp column (e.g., created_at) between '${dateRange.from}' and '${dateRange.to}'.`
    : "";

  // R3 FIX: Add the correction prompt if there was an error
  const correctionPrompt = previousError && previousSql 
    ? `\n\nIMPORTANT CORRECTION: You previously generated this SQL:\n${previousSql}\nBut the database returned this error:\n"${previousError}"\nPlease fix the SQL to resolve this error.`
    : "";

  let retries = 3;
  while (retries > 0) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Question: ${question}`,
        config: {
          systemInstruction: `You are an expert PostgreSQL developer. Write a single, safe SELECT query to answer the user's question using ONLY the provided schema and custom metrics.
          
Schema:
${schemaPrompt}

Custom Metrics (Use these exact SQL expressions when the user asks for these concepts):
${metricsPrompt}

${dateInstruction}
${correctionPrompt}

Rules:
- Return ONLY a SELECT statement.
- Never use INSERT, UPDATE, DELETE, DROP, etc.
- If the query is unaggregated (no GROUP BY), you MUST include a LIMIT of 100 or less.
- Use standard Postgres syntax.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sql: { type: Type.STRING, description: "The raw SQL query to execute" },
              explanation: { type: Type.STRING, description: "A brief, friendly explanation of what the query does" }
            },
            required: ["sql", "explanation"]
          }
        }
      });

      const content = response.text;
      if (!content) throw new Error("Gemini returned empty content");

      return JSON.parse(content) as NLSQLResult;

    } catch (err: any) {
      if (err.status === 503 || err.status === 429) {
        retries--;
        if (retries === 0) {
          throw new AppError("internal_error", "The AI is currently overloaded. Please try again in a minute.", 503);
        }
        await new Promise(r => setTimeout(r, 5000));
      } else {
        throw err; 
      }
    }
  }
  
  throw new Error("Failed to generate SQL after retries");
}