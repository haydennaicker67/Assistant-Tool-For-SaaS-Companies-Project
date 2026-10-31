import { GoogleGenAI, Type } from "@google/genai";
import type { SemanticLayer } from "@vizzly-sa/shared";
import { AppError } from "../errors";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface NLSQLResult {
  sql: string;
  explanation: string;
}

export async function generateSQL(question: string, layer: SemanticLayer): Promise<NLSQLResult> {
  const schemaPrompt = JSON.stringify(layer.tables, null, 2);
  
  // Add the custom metrics to the prompt if they exist
  const metricsPrompt = layer.metrics && layer.metrics.length > 0 
    ? JSON.stringify(layer.metrics, null, 2) 
    : "No custom metrics defined.";

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
      // If it's a 503 (Unavailable) or 429 (Rate Limit), retry
      if (err.status === 503 || err.status === 429) {
        retries--;
        if (retries === 0) {
          throw new AppError("internal_error", "The AI is currently overloaded. Please try again in a minute.", 503);
        }
        // Wait 5 seconds before trying again
        await new Promise(r => setTimeout(r, 5000));
      } else {
        throw err; // If it's a different error (like 404), fail immediately
      }
    }
  }
  
  throw new Error("Failed to generate SQL after retries");
}