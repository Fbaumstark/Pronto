import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 50 }).notNull().default("replit"),
  ownApiKey: text("own_api_key"),
  openaiApiKey: text("openai_api_key"),
  googleApiKey: text("google_api_key"),
  orchestrationMode: varchar("orchestration_mode", { length: 20 }).notNull().default("auto"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
