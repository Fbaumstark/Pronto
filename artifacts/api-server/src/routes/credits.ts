import { Router, type IRouter } from "express";
import { eq, sum, sql } from "drizzle-orm";
import { db, creditLedgerTable, usersTable } from "@workspace/db";
import { isUnlimitedUser } from "../lib/admin";
import { getUncachableStripeClient } from "../lib/stripeClient";

const router: IRouter = Router();

async function getUserBalance(userId: string): Promise<number> {
  const result = await db
    .select({ total: sum(creditLedgerTable.amount) })
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.userId, userId));
  return Number(result[0]?.total ?? 0);
}

router.get("/credits", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (isUnlimitedUser(req.user.email)) {
    res.json({ balance: null, unlimited: true });
    return;
  }

  const balance = await getUserBalance(req.user.id);
  res.json({ balance, unlimited: false });
});

router.get("/credits/history", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const history = await db
    .select()
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.userId, req.user.id))
    .orderBy(creditLedgerTable.createdAt);
  res.json(history);
});

router.get("/credits/products", async (_req, res) => {
  try {
    let rows: any[] = [];

    try {
      const result = await db.execute(sql`
        SELECT
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency
        FROM stripe.products p
        JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
          AND (p.metadata->>'credits') IS NOT NULL
        ORDER BY pr.unit_amount ASC
      `);
      rows = result.rows as any[];
    } catch {
      const stripe = await getUncachableStripeClient();
      const { products, prices } = await stripe.listProductsWithPrices?.() ??
        { products: [], prices: [] };

      for (const product of products) {
        if (!product.metadata?.credits) continue;
        const productPrices = prices.filter((p: any) => p.product === product.id && p.active);
        for (const price of productPrices) {
          rows.push({
            product_id: product.id,
            product_name: product.name,
            product_description: product.description,
            product_metadata: product.metadata,
            price_id: price.id,
            unit_amount: price.unit_amount,
            currency: price.currency,
          });
        }
      }
    }

    res.json({ data: rows });
  } catch (err: any) {
    console.error("Error fetching credit products:", err);
    res.status(500).json({ error: "Failed to fetch credit products" });
  }
});

router.post("/credits/checkout", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { priceId } = req.body;
  if (!priceId) {
    res.status(400).json({ error: "priceId is required" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const userId = req.user.id;
    const userEmail = req.user.email;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

    let customerId = user?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.createCustomer({
        email: userEmail ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await db.update(usersTable)
        .set({ stripeCustomerId: customerId })
        .where(eq(usersTable.id, userId));
    }

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost";
    const baseUrl = `https://${domain}`;

    const session = await stripe.createCheckoutSession({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${baseUrl}/ai-builder/?payment=success`,
      cancel_url: `${baseUrl}/ai-builder/?payment=cancelled`,
      metadata: { userId },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export { getUserBalance };
export default router;
