import { pgTable, serial, varchar, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const creditLedgerTable = pgTable("credit_ledger", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CreditLedgerEntry = typeof creditLedgerTable.$inferSelect;
