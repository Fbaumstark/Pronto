import { pgTable, serial, integer, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const projectVersionsTable = pgTable("project_versions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  label: varchar("label", { length: 255 }),
  filesSnapshot: jsonb("files_snapshot").notNull().$type<{ filename: string; content: string; language: string }[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProjectVersion = typeof projectVersionsTable.$inferSelect;
