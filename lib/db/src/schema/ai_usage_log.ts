import { pgTable, serial, varchar, integer, real, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { projectsTable } from "./projects";

export const aiUsageLogTable = pgTable("ai_usage_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  provider: varchar("provider", { length: 20 }).notNull().default("replit"),
  model: varchar("model", { length: 100 }).notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  creditsCharged: integer("credits_charged").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AiUsageLog = typeof aiUsageLogTable.$inferSelect;
