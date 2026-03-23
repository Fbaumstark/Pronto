import { pgTable, serial, integer, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { usersTable } from "./auth";

export const orchestrationMemoryTable = pgTable("orchestration_memory", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  agentId: varchar("agent_id", { length: 100 }),
  content: text("content").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("context"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type OrchestrationMemory = typeof orchestrationMemoryTable.$inferSelect;
