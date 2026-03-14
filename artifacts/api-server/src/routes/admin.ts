import { Router } from "express";
import { sql, desc } from "drizzle-orm";
import { db, usersTable, creditLedgerTable } from "@workspace/db";
import { isUnlimitedUser } from "../lib/admin";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !isUnlimitedUser(req.user?.email)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

router.get("/admin/stats", requireAdmin, async (_req, res) => {
  // All users
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  // Credits used per user (negative ledger entries = consumed)
  const usageRows = await db.execute(sql`
    SELECT
      user_id,
      ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)) AS credits_used,
      SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)       AS credits_received
    FROM credit_ledger
    GROUP BY user_id
  `);

  const usageMap = new Map<string, { used: number; received: number }>();
  for (const r of usageRows.rows as any[]) {
    usageMap.set(r.user_id, {
      used: Number(r.credits_used ?? 0),
      received: Number(r.credits_received ?? 0),
    });
  }

  // Total paid (cents) per user from Stripe charges table
  let revenueMap = new Map<string, number>();
  try {
    const revenueRows = await db.execute(sql`
      SELECT
        u.id                                    AS user_id,
        COALESCE(SUM(ch.amount), 0)             AS total_cents
      FROM users u
      LEFT JOIN stripe.charges ch
        ON ch._raw_data->>'customer' = u.stripe_customer_id
        AND ch.paid = true
      GROUP BY u.id
    `);
    for (const r of revenueRows.rows as any[]) {
      revenueMap.set(r.user_id, Number(r.total_cents ?? 0));
    }
  } catch {
    // stripe schema may be empty in dev
  }

  const enriched = users.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    createdAt: u.createdAt,
    creditsUsed: usageMap.get(u.id)?.used ?? 0,
    creditsReceived: usageMap.get(u.id)?.received ?? 0,
    totalSpentCents: revenueMap.get(u.id) ?? 0,
  }));

  const totalRevenueCents = enriched.reduce((s, u) => s + u.totalSpentCents, 0);
  const totalCreditsUsed = enriched.reduce((s, u) => s + u.creditsUsed, 0);

  res.json({
    summary: {
      totalUsers: enriched.length,
      totalRevenueDollars: totalRevenueCents / 100,
      totalCreditsUsed,
    },
    users: enriched,
  });
});

export default router;
