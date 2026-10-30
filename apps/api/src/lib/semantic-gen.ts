import { GoogleGenAI, Type } from "@google/genai";
import type { SemanticLayer } from "@vizzly-sa/shared";
import type { RawSchema } from "./schema-introspect";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateSemanticLayer(rawSchema: RawSchema[]): Promise<SemanticLayer> {
  // Group raw columns into tables for the prompt
  const tablesMap = new Map<string, RawSchema[]>();
  for (const row of rawSchema) {
    if (!tablesMap.has(row.tableName)) tablesMap.set(row.tableName, []);
    tablesMap.get(row.tableName)!.push(row);
  }

  const schemaPrompt = Array.from(tablesMap.entries()).map(([table, cols]) => {
    return `Table: ${table}\n` + cols.map(c => `  - ${c.columnName} (${c.dataType})`).join("\n");
  }).join("\n\n");

  // We define the exact JSON schema Gemini must adhere to.
  // This replaces OpenAI's "Structured Outputs" feature.
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash", 
    contents: `Here is the raw PostgreSQL schema:\n\n${schemaPrompt}`,
    config: {
      systemInstruction: `You are an expert data engineer building a semantic layer for a SaaS analytics tool in South Africa.
Given a raw PostgreSQL schema, generate human-readable descriptions for every table and column.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tables: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "exact table name" },
                description: { type: Type.STRING, description: "human readable" },
                columns: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING, description: "exact column name" },
                      type: { 
                        type: Type.STRING, 
                        enum: ["text", "integer", "bigint", "numeric", "boolean", "timestamp", "date", "uuid", "json", "unknown"] 
                      },
                      description: { type: Type.STRING, description: "human readable" },
                      isDimension: { type: Type.BOOLEAN },
                      isMeasure: { type: Type.BOOLEAN }
                    },
                    required: ["name", "type", "description", "isDimension", "isMeasure"]
                  }
                },
                primaryKey: { type: Type.ARRAY, items: { type: Type.STRING } },
                foreignKeys: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { column: {type: Type.STRING}, referencesTable: {type: Type.STRING}, referencesColumn: {type: Type.STRING} } } }
              },
              required: ["name", "description", "columns", "primaryKey", "foreignKeys"]
            }
          },
          metrics: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: {type: Type.STRING}, label: {type: Type.STRING}, description: {type: Type.STRING}, sqlExpression: {type: Type.STRING} } } },
          publishedAt: { type: Type.STRING, nullable: true },
          published: { type: Type.BOOLEAN }
        },
        required: ["tables", "metrics", "publishedAt", "published"]
      }
    }
  });

  const content = response.text;
  if (!content) throw new Error("Gemini returned empty content");

  const parsed = JSON.parse(content) as SemanticLayer;
  return parsed;
}