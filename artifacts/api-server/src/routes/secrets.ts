import { Router } from "express";
import { db } from "@workspace/db";
import { userSecretsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

const ALGO = "aes-256-cbc";
const DEFAULT_KEY = "pronto-default-enc-key-32-chars!";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw === DEFAULT_KEY) {
    // Warn once on first use rather than crashing so existing dev environments
    // keep working, but make it unmissable in logs.
    console.warn(
      "[SECURITY] ENCRYPTION_KEY is not set or is using the insecure default. " +
      "Set a strong random ENCRYPTION_KEY environment secret before going to production."
    );
    return crypto.createHash("sha256").update(DEFAULT_KEY).digest();
  }
  return crypto.createHash("sha256").update(raw).digest();
}

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function maskValue(decrypted: string): string {
  if (decrypted.length <= 8) return "••••••••";
  return decrypted.slice(0, 4) + "••••••••" + decrypted.slice(-4);
}

/**
 * Server-side only helper — returns a plain-text key→value map for a user's
 * secrets so they can be injected at runtime into preview/deployed HTML.
 * Never expose the return value over the network.
 */
export async function getUserDecryptedSecrets(userId: string): Promise<Record<string, string>> {
  const rows = await db
    .select()
    .from(userSecretsTable)
    .where(eq(userSecretsTable.userId, userId));

  const env: Record<string, string> = {};
  for (const r of rows) {
    try { env[r.name] = decrypt(r.encryptedValue); } catch {}
  }
  return env;
}

/**
 * Injects a <script>window.__env = {...}</script> block into an HTML string
 * so the running app can access secrets via window.__env.MY_SECRET.
 * Values are never stored in the file — they are injected fresh at each serve.
 */
export function injectEnvScript(html: string, env: Record<string, string>): string {
  if (Object.keys(env).length === 0) return html;
  const safeJson = JSON.stringify(env).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
  const script = `<script>window.__env=Object.freeze(${safeJson});</script>`;
  // Prefer injecting right before </head>; fall back to start of <body>; or prepend.
  if (html.includes("</head>")) return html.replace("</head>", `${script}</head>`);
  if (html.includes("<body>"))  return html.replace("<body>", `<body>${script}`);
  return script + html;
}

// ── API routes ────────────────────────────────────────────────────────────────

router.get("/api/secrets", async (req, res) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db
    .select()
    .from(userSecretsTable)
    .where(eq(userSecretsTable.userId, req.session.userId))
    .orderBy(userSecretsTable.createdAt);

  res.json(rows.map((r) => ({
    id: r.id,
    name: r.name,
    maskedValue: maskValue(decrypt(r.encryptedValue)),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  })));
});

router.post("/api/secrets", async (req, res) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, value } = req.body;
  if (!name || !value) { res.status(400).json({ error: "name and value are required" }); return; }

  const nameKey = name.trim().toUpperCase().replace(/\s+/g, "_");

  const existing = await db
    .select()
    .from(userSecretsTable)
    .where(and(eq(userSecretsTable.userId, req.session.userId), eq(userSecretsTable.name, nameKey)));

  if (existing.length > 0) {
    const [updated] = await db
      .update(userSecretsTable)
      .set({ encryptedValue: encrypt(value), updatedAt: new Date() })
      .where(eq(userSecretsTable.id, existing[0].id))
      .returning();
    res.json({ id: updated.id, name: updated.name, maskedValue: maskValue(value) });
    return;
  }

  const [row] = await db
    .insert(userSecretsTable)
    .values({ userId: req.session.userId, name: nameKey, encryptedValue: encrypt(value) })
    .returning();

  res.json({ id: row.id, name: row.name, maskedValue: maskValue(value) });
});

router.delete("/api/secrets/:id", async (req, res) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  await db
    .delete(userSecretsTable)
    .where(and(eq(userSecretsTable.id, id), eq(userSecretsTable.userId, req.session.userId)));
  res.json({ ok: true });
});

// NOTE: The /api/secrets/env endpoint has been intentionally removed.
// Returning plaintext secret values over the network is a security risk.
// Secrets are injected server-side at serve-time via injectEnvScript().

export default router;
