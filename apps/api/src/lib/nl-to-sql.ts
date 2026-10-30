import { GoogleGenAI, Type } from "@google/genai";
import type { SemanticLayer } from "@vizzly-sa/shared";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface NLSQLResult {
  sql: string;
  explanation: string;
}

export async function generateSQL(question: string, layer: SemanticLayer): Promise<NLSQLResult> {
  const schemaPrompt = JSON.stringify(layer.tables, null, 2);

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: `Question: ${question}`,
    config: {
      systemInstruction: `You are an expert PostgreSQL developer. Write a single, safe SELECT query to answer the user's question using ONLY the provided schema.
      
Schema:
${schemaPrompt}

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
}