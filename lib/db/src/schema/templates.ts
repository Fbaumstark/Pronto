import { pgTable, serial, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  emoji: varchar("emoji", { length: 10 }).notNull().default("📄"),
  files: jsonb("files").notNull().$type<{ filename: string; content: string; language: string }[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Template = typeof templatesTable.$inferSelect;
