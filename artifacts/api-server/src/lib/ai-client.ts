import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { anthropic as replitAnthropic } from "@workspace/integrations-anthropic-ai";
import { db, appSettingsTable } from "@workspace/db";

// Cache app settings for 15 s to avoid repeated DB round-trips on every request
let _settingsCache: { value: any; expiresAt: number } | null = null;

export async function getCachedAppSettings(): Promise<any> {
  if (_settingsCache && Date.now() < _settingsCache.expiresAt) {
    return _settingsCache.value;
  }
  const [settings] = await db.select().from(appSettingsTable).limit(1);
  _settingsCache = { value: settings ?? null, expiresAt: Date.now() + 15_000 };
  return _settingsCache.value;
}

/** Call this after a settings write so the next request sees fresh data. */
export function invalidateSettingsCache() {
  _settingsCache = null;
}

export async function getAIClient(): Promise<{ client: Anthropic; provider: "own" | "replit" }> {
  try {
    const settings = await getCachedAppSettings();
    if (settings?.provider === "own" && settings.ownApiKey) {
      return { client: new Anthropic({ apiKey: settings.ownApiKey }), provider: "own" };
    }
  } catch {
  }
  return { client: replitAnthropic, provider: "replit" };
}

export async function getSettings() {
  const [settings] = await db.select().from(appSettingsTable).limit(1);
  if (!settings) {
    const [created] = await db
      .insert(appSettingsTable)
      .values({ provider: "replit" })
      .returning();
    return { provider: created.provider, hasOwnApiKey: false, hasOpenaiKey: false, hasGoogleKey: false, orchestrationMode: "auto" };
  }
  return {
    provider: settings.provider,
    hasOwnApiKey: !!settings.ownApiKey,
    hasOpenaiKey: !!settings.openaiApiKey,
    hasGoogleKey: !!settings.googleApiKey,
    orchestrationMode: settings.orchestrationMode ?? "auto",
  };
}

export async function updateSettings(
  provider: string,
  ownApiKey?: string,
  openaiApiKey?: string,
  googleApiKey?: string,
  orchestrationMode?: string,
) {
  const [existing] = await db.select().from(appSettingsTable).limit(1);
  const updates: Record<string, any> = {
    provider,
    updatedAt: new Date(),
  };
  if (ownApiKey !== undefined) updates.ownApiKey = ownApiKey || null;
  if (openaiApiKey !== undefined) updates.openaiApiKey = openaiApiKey || null;
  if (googleApiKey !== undefined) updates.googleApiKey = googleApiKey || null;
  if (orchestrationMode !== undefined) updates.orchestrationMode = orchestrationMode;

  if (existing) {
    await db
      .update(appSettingsTable)
      .set(updates)
      .where(eq(appSettingsTable.id, existing.id));
  } else {
    await db.insert(appSettingsTable).values({
      provider,
      ownApiKey: ownApiKey || null,
      openaiApiKey: openaiApiKey || null,
      googleApiKey: googleApiKey || null,
      orchestrationMode: orchestrationMode || "auto",
    });
  }
  return getSettings();
}
