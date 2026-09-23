import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const profilesTable = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const projectsTable = pgTable("projects", {
  id: uuid("id").primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  applicationType: text("application_type").notNull(),
  applicationUrl: text("application_url").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const projectSettingsTable = pgTable("project_settings", {
  projectId: uuid("project_id").primaryKey(),
  defaultTimeoutMs: integer("default_timeout_ms").notNull(),
  notificationsEnabled: boolean("notifications_enabled").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const adaptiveContractsTable = pgTable("adaptive_contracts", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull(),
  profile: text("profile").notNull(),
  networkProfile: text("network_profile").notNull(),
  imagePolicy: text("image_policy").notNull(),
  javascriptPolicy: text("javascript_policy").notNull(),
  featurePolicy: text("feature_policy").notNull(),
  maxResourceSizeKb: integer("max_resource_size_kb").notNull(),
  maxLcpMs: integer("max_lcp_ms").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const testProfilesTable = pgTable("test_profiles", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  networkProfile: text("network_profile").notNull(),
  imagePolicy: text("image_policy").notNull(),
  javascriptPolicy: text("javascript_policy").notNull(),
  featurePolicy: text("feature_policy").notNull(),
  maxResourceSizeKb: integer("max_resource_size_kb").notNull(),
  maxLcpMs: integer("max_lcp_ms").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const testRunsTable = pgTable("test_runs", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull(),
  profile: text("profile").notNull(),
  method: text("method").notNull(),
  configuration: jsonb("configuration")
    .$type<Record<string, unknown>>()
    .notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const testSignalsTable = pgTable("test_signals", {
  id: uuid("id").primaryKey(),
  testRunId: uuid("test_run_id").notNull(),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull(),
  detected: jsonb("detected").$type<Record<string, unknown>>().notNull(),
  warnings: jsonb("warnings").$type<string[]>().notNull(),
  error: text("error"),
  analysis: jsonb("analysis").$type<{
    summary: string;
    rootCause: string;
    impact: string;
    explanation: string;
    recommendations: string[];
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const testResourcesTable = pgTable("test_resources", {
  id: uuid("id").primaryKey(),
  testRunId: uuid("test_run_id").notNull(),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const testMetricsTable = pgTable("test_metrics", {
  id: uuid("id").primaryKey(),
  testRunId: uuid("test_run_id").notNull(),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const testViolationsTable = pgTable("test_violations", {
  id: uuid("id").primaryKey(),
  testRunId: uuid("test_run_id").notNull(),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});