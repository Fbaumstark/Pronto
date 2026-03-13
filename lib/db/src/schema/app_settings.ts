import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 50 }).notNull().default("replit"),
  ownApiKey: text("own_api_key"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
