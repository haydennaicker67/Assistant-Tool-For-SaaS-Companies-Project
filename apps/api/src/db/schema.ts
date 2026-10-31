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
  dbConnectionString: text("db_connection_string").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // NEW: Billing columns for Paystack
  billingCustomerId: text("billing_customer_id"),
  planTier: text("plan_tier").default("free").notNull(), // 'free' | 'growth' | 'scale'
});

// 2. Tenants (End-customers of the SaaS app)
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  externalId: text("external_id").notNull(), // The ID used by the SaaS app
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
  // Removed the reference to tenants. Tenant IDs live in the customer's DB, not ours.
  tenantId: text("tenant_id").notNull(), 
  eventType: text("event_type").notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6. Query Cache
export const queryCache = pgTable("query_cache", {
  hash: text("hash").primaryKey(), // tenant_id:user_id:query_hash
  payload: jsonb("payload").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// 7. Audit Logs (Enterprise)
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  actorId: text("actor_id").notNull(), // e.g., the user_id from the JWT or developer email
  action: text("action").notNull(), // 'query', 'export', 'semantic_update', 'login'
  details: jsonb("details").notNull(), // e.g., { sql: "...", question: "..." }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});