import { Router } from "express";
import { sql, desc } from "drizzle-orm";
import { db, usersTable, creditLedgerTable, aiUsageLogTable } from "@workspace/db";
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

// ── AI Cost Analytics ──────────────────────────────────────────────
router.get("/admin/ai-costs", requireAdmin, async (req, res) => {
  const period = (req.query.period as string) ?? "month";

  // Map period → interval string and number of buckets
  const periodConfig: Record<string, { trunc: string; interval: string; buckets: number; labelFmt: string }> = {
    day:    { trunc: "hour",  interval: "1 day",    buckets: 24, labelFmt: "HH24:00" },
    week:   { trunc: "day",   interval: "7 days",   buckets: 7,  labelFmt: "Dy" },
    month:  { trunc: "day",   interval: "30 days",  buckets: 30, labelFmt: "MM/DD" },
    year:   { trunc: "month", interval: "1 year",   buckets: 12, labelFmt: "Mon" },
    "3year":  { trunc: "month", interval: "3 years",  buckets: 36, labelFmt: "Mon YY" },
    "5year":  { trunc: "month", interval: "5 years",  buckets: 60, labelFmt: "Mon YY" },
  };

  const cfg = periodConfig[period] ?? periodConfig["month"];

  // Timeseries of cost grouped by period bucket AND provider
  const tsRows = await db.execute(sql`
    SELECT
      date_trunc(${cfg.trunc}, created_at)          AS bucket,
      provider,
      COUNT(*)::int                                  AS generations,
      SUM(input_tokens)::bigint                      AS input_tokens,
      SUM(output_tokens)::bigint                     AS output_tokens,
      SUM(cost_usd)::float                           AS cost_usd,
      SUM(credits_charged)::bigint                   AS credits_charged
    FROM ai_usage_log
    WHERE created_at >= NOW() - ${cfg.interval}::interval
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `);

  // Summary totals for the period (both providers combined + split)
  const summaryRows = await db.execute(sql`
    SELECT
      provider,
      COUNT(*)::int                 AS generations,
      SUM(input_tokens)::bigint     AS input_tokens,
      SUM(output_tokens)::bigint    AS output_tokens,
      SUM(cost_usd)::float          AS cost_usd,
      SUM(credits_charged)::bigint  AS credits_charged
    FROM ai_usage_log
    WHERE created_at >= NOW() - ${cfg.interval}::interval
    GROUP BY provider
  `);

  // Top users for the period
  const topUsersRows = await db.execute(sql`
    SELECT
      u.id,
      u.email,
      u.first_name,
      COUNT(l.id)::int              AS generations,
      SUM(l.cost_usd)::float        AS cost_usd,
      SUM(l.credits_charged)::bigint AS credits_charged
    FROM ai_usage_log l
    JOIN users u ON u.id = l.user_id
    WHERE l.created_at >= NOW() - ${cfg.interval}::interval
    GROUP BY u.id, u.email, u.first_name
    ORDER BY cost_usd DESC
    LIMIT 10
  `);

  // All-time totals
  const allTimeRows = await db.execute(sql`
    SELECT
      COUNT(*)::int                 AS generations,
      SUM(input_tokens)::bigint     AS input_tokens,
      SUM(output_tokens)::bigint    AS output_tokens,
      SUM(cost_usd)::float          AS cost_usd,
      SUM(credits_charged)::bigint  AS credits_charged
    FROM ai_usage_log
  `);

  res.json({
    period,
    timeseries: tsRows.rows,
    summary: summaryRows.rows,
    topUsers: topUsersRows.rows,
    allTime: allTimeRows.rows[0] ?? {},
  });
});

export default router;
