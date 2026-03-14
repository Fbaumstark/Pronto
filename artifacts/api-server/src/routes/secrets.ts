import { Router } from "express";
import { db } from "@workspace/db";
import { userSecretsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

const ALGO = "aes-256-cbc";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? "pronto-default-enc-key-32-chars!";
  return crypto.createHash("sha256").update(raw).digest();
}

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(ciphertext: string): string {
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

router.get("/api/secrets", async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
  const rows = await db
    .select()
    .from(userSecretsTable)
    .where(eq(userSecretsTable.userId, req.session.userId))
    .orderBy(userSecretsTable.createdAt);

  const result = rows.map((r) => ({
    id: r.id,
    name: r.name,
    maskedValue: maskValue(decrypt(r.encryptedValue)),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  res.json(result);
});

router.post("/api/secrets", async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
  const { name, value } = req.body;
  if (!name || !value) return res.status(400).json({ error: "name and value are required" });

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
    return res.json({ id: updated.id, name: updated.name, maskedValue: maskValue(value) });
  }

  const [row] = await db
    .insert(userSecretsTable)
    .values({ userId: req.session.userId, name: nameKey, encryptedValue: encrypt(value) })
    .returning();

  res.json({ id: row.id, name: row.name, maskedValue: maskValue(value) });
});

router.delete("/api/secrets/:id", async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  await db
    .delete(userSecretsTable)
    .where(and(eq(userSecretsTable.id, id), eq(userSecretsTable.userId, req.session.userId)));
  res.json({ ok: true });
});

router.get("/api/secrets/env", async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
  const rows = await db
    .select()
    .from(userSecretsTable)
    .where(eq(userSecretsTable.userId, req.session.userId));

  const env: Record<string, string> = {};
  for (const r of rows) {
    try { env[r.name] = decrypt(r.encryptedValue); } catch {}
  }
  res.json(env);
});

export default router;
