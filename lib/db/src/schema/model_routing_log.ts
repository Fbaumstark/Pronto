import { pgTable, serial, integer, varchar, real, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const modelRoutingLogTable = pgTable("model_routing_log", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  promptHash: varchar("prompt_hash", { length: 64 }),
  taskType: varchar("task_type", { length: 50 }).notNull(),
  chosenModel: varchar("chosen_model", { length: 100 }).notNull(),
  chosenProvider: varchar("chosen_provider", { length: 30 }).notNull(),
  confidence: real("confidence").notNull().default(0.5),
  outcome: varchar("outcome", { length: 30 }),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ModelRoutingLog = typeof modelRoutingLogTable.$inferSelect;
