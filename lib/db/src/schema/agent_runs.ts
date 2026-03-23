import { pgTable, serial, integer, varchar, real, text, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { projectMessagesTable } from "./project_messages";

export const agentRunsTable = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  messageId: integer("message_id").references(() => projectMessagesTable.id, { onDelete: "set null" }),
  agentType: varchar("agent_type", { length: 50 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  resultSummary: text("result_summary"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type AgentRun = typeof agentRunsTable.$inferSelect;
