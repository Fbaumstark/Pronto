import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const userSecretsTable = pgTable("user_secrets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserSecret = typeof userSecretsTable.$inferSelect;
