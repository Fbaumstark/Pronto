import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { anthropic as replitAnthropic } from "@workspace/integrations-anthropic-ai";
import { db, appSettingsTable } from "@workspace/db";

export async function getAIClient(): Promise<Anthropic> {
  try {
    const [settings] = await db.select().from(appSettingsTable).limit(1);
    if (settings?.provider === "own" && settings.ownApiKey) {
      return new Anthropic({ apiKey: settings.ownApiKey });
    }
  } catch {
  }
  return replitAnthropic;
}

export async function getSettings() {
  const [settings] = await db.select().from(appSettingsTable).limit(1);
  if (!settings) {
    const [created] = await db
      .insert(appSettingsTable)
      .values({ provider: "replit" })
      .returning();
    return { provider: created.provider, hasOwnApiKey: false };
  }
  return {
    provider: settings.provider,
    hasOwnApiKey: !!settings.ownApiKey,
  };
}

export async function updateSettings(provider: string, ownApiKey?: string) {
  const [existing] = await db.select().from(appSettingsTable).limit(1);
  if (existing) {
    await db
      .update(appSettingsTable)
      .set({
        provider,
        ...(ownApiKey !== undefined ? { ownApiKey: ownApiKey || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(appSettingsTable.id, existing.id));
  } else {
    await db.insert(appSettingsTable).values({
      provider,
      ownApiKey: ownApiKey || null,
    });
  }
  return getSettings();
}
