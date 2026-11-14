import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { SemanticLayer } from "@vizzly-sa/shared";

// 1. Projects
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  dbConnectionStringEncrypted: text("db_connection_string_encrypted").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  
  // Ownership
  userId: uuid("user_id").notNull(), 
  
  // Billing
  billingCustomerId: text("billing_customer_id"),
  planTier: text("plan_tier").default("free").notNull(), 

  // RSA private key for test dashboard
  embedPrivateKeyEncrypted: text("embed_private_key_encrypted"),

  // S20 FIX: Optional CA certificate for TLS verification
  caCertificateEncrypted: text("ca_certificate_encrypted"),
});

// 2. Tenants
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  externalId: text("external_id").notNull(), 
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Semantic Layers
export const semanticLayers = pgTable("semantic_layers", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  layer: jsonb("layer").$type<SemanticLayer>().notNull(),
  published: boolean("published").default(false).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdUnique: uniqueIndex("semantic_layers_project_id_unique").on(table.projectId),
}));

// 4. Embed Secrets
export const embedSecrets = pgTable("embed_secrets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  publicKey: text("public_key").notNull(), 
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdUnique: uniqueIndex("embed_secrets_project_id_unique").on(table.projectId),
}));

// 5. Usage Events
export const usageEvents = pgTable("usage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  tenantId: text("tenant_id").notNull(), 
  eventType: text("event_type").notNull(), 
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectCreatedIdx: index("usage_events_project_created_idx").on(table.projectId, table.createdAt),
}));

// 6. Query Cache
export const queryCache = pgTable("query_cache", {
  hash: text("hash").primaryKey(), 
  payload: jsonb("payload").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// 7. Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  actorId: text("actor_id").notNull(), 
  action: text("action").notNull(), 
  details: jsonb("details").notNull(), 
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectCreatedIdx: index("audit_logs_project_created_idx").on(table.projectId, table.createdAt),
}));

// 8. Semantic Layer Versions
export const semanticLayerVersions = pgTable("semantic_layer_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  layer: jsonb("layer").$type<SemanticLayer>().notNull(),
  versionNumber: integer("version_number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});