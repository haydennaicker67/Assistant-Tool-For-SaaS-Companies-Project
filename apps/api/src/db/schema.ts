import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean
} from "drizzle-orm/pg-core";
import type { SemanticLayer } from "@vizzly-sa/shared";

// 1. Projects
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  dbConnectionStringEncrypted: text("db_connection_string_encrypted").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // NEW: Ownership (S2)
  userId: uuid("user_id").notNull(), // References auth.users in Supabase
  
  // Billing columns for Paystack
  billingCustomerId: text("billing_customer_id"),
  planTier: text("plan_tier").default("free").notNull(), 
});

// 2. Tenants (End-customers of the SaaS app)
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  externalId: text("external_id").notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Semantic Layers
export const semanticLayers = pgTable("semantic_layers", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  layer: jsonb("layer").$type<SemanticLayer>().notNull(),
  published: boolean("published").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 4. Embed Secrets
export const embedSecrets = pgTable("embed_secrets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  secret: text("secret").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 5. Usage Events
export const usageEvents = pgTable("usage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  tenantId: text("tenant_id").notNull(), 
  eventType: text("event_type").notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6. Query Cache
export const queryCache = pgTable("query_cache", {
  hash: text("hash").primaryKey(), 
  payload: jsonb("payload").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// 7. Audit Logs (Enterprise)
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  actorId: text("actor_id").notNull(), 
  action: text("action").notNull(), 
  details: jsonb("details").notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 8. Semantic Layer Versions (Enterprise)
export const semanticLayerVersions = pgTable("semantic_layer_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  layer: jsonb("layer").$type<SemanticLayer>().notNull(),
  versionNumber: integer("version_number").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});