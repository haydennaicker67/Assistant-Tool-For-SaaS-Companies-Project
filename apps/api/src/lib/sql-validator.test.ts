import { describe, it, expect } from "vitest";
import { validateSQL } from "./sql-validator";
import type { SemanticLayer } from "@vizzly-sa/shared";

// Mock Semantic Layer
const mockLayer: SemanticLayer = {
  version: 1,
  published: true,
  publishedAt: null,
  metrics: [],
  tables: [
    {
      name: "projects",
      description: "SaaS projects",
      primaryKey: ["id"],
      foreignKeys: [],
      columns: [
        { name: "id", type: "uuid", description: "ID", isDimension: true, isMeasure: false },
        { name: "name", type: "text", description: "Name", isDimension: true, isMeasure: false },
        { name: "created_at", type: "timestamp", description: "Date", isDimension: true, isMeasure: false },
      ]
    },
    {
      name: "usage_events",
      description: "Usage logs",
      primaryKey: ["id"],
      foreignKeys: [{ column: "project_id", referencesTable: "projects", referencesColumn: "id" }],
      columns: [
        { name: "id", type: "uuid", description: "ID", isDimension: true, isMeasure: false },
        { name: "project_id", type: "uuid", description: "FK", isDimension: true, isMeasure: false },
        { name: "event_type", type: "text", description: "Type", isDimension: true, isMeasure: false },
        { name: "created_at", type: "timestamp", description: "Date", isDimension: true, isMeasure: false },
      ]
    }
  ]
};

// R3 FIX: Golden questions to test our validator
const goldenQuestions = [
  "SELECT * FROM projects",
  "SELECT COUNT(*) FROM projects",
  "SELECT name, created_at FROM projects LIMIT 10",
  "SELECT project_id, COUNT(*) FROM usage_events GROUP BY project_id",
  "SELECT p.name, COUNT(u.id) FROM projects p JOIN usage_events u ON p.id = u.project_id GROUP BY p.name",
  "SELECT * FROM usage_events WHERE created_at > NOW() - INTERVAL '7 days'",
  "SELECT event_type, COUNT(*) as count FROM usage_events GROUP BY event_type",
  "SELECT * FROM projects WHERE name ILIKE '%acme%' LIMIT 5",
  "SELECT SUM(id) FROM projects",
  "SELECT * FROM projects ORDER BY created_at DESC LIMIT 1"
];

describe("SQL Validator (Golden Questions)", () => {
  goldenQuestions.forEach((sql, index) => {
    it(`should allow valid query #${index + 1}: ${sql.substring(0, 30)}...`, () => {
      const result = validateSQL(sql, mockLayer);
      expect(result).toBeTruthy();
    });
  });

  it("should block DROP statements", () => {
    expect(() => validateSQL("DROP TABLE projects", mockLayer)).toThrow();
  });

  it("should block multi-statement queries", () => {
    expect(() => validateSQL("SELECT * FROM projects; DROP TABLE projects;", mockLayer)).toThrow();
  });

  it("should block system catalogs", () => {
    expect(() => validateSQL("SELECT * FROM pg_catalog.pg_tables", mockLayer)).toThrow();
  });

  it("should block tables not in the semantic layer", () => {
    expect(() => validateSQL("SELECT * FROM secret_passwords", mockLayer)).toThrow();
  });
});