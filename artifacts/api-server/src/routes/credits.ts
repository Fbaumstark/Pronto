import { Router, type IRouter } from "express";
import { eq, sum, count, sql } from "drizzle-orm";
import { db, creditLedgerTable, usersTable } from "@workspace/db";
import { isUnlimitedUser } from "../lib/admin";
import { getUncachableStripeClient } from "../lib/stripeClient";

const FREE_CREDITS = 50000;
const MONTHLY_CREDITS = 500000;
const TOPUP_CREDITS = 1250000;
const TOPUP_AMOUNT_CENTS = 2500; // $25

// Price IDs from Stripe setup script output
const MONTHLY_PRICE_ID = "price_1TAcQUGx0FO9OC64gSq83qKn";

const router: IRouter = Router();

export async function getUserBalance(userId: string): Promise<number> {
  const result = await db
    .select({ total: sum(creditLedgerTable.amount) })
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.userId, userId));
  return Number(result[0]?.total ?? 0);
}

export async function ensureFreeCredits(userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.userId, userId));
  if ((row?.n ?? 0) === 0) {
    await db.insert(creditLedgerTable).values({
      userId,
      amount: FREE_CREDITS,
      type: "signup_bonus",
      description: "Free credits on signup",
    });
  }
}

// Called by webhook when subscription invoice is paid
export async function grantSubscriptionCredits(userId: string, invoiceId: string) {
  // Idempotency: don't double-grant for same invoice
  const [existing] = await db
    .select({ n: count() })
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.description, `Subscription renewal: ${invoiceId}`));
  if ((existing?.n ?? 0) > 0) {
    console.log(`Credits already granted for invoice ${invoiceId}`);
    return;
  }
  await db.insert(creditLedgerTable).values({
    userId,
    amount: MONTHLY_CREDITS,
    type: "stripe_purchase",
    description: `Subscription renewal: ${invoiceId}`,
  });
  console.log(`Granted ${MONTHLY_CREDITS} subscription credits to user ${userId}`);
}

// Called by webhook when auto top-up PaymentIntent succeeds
export async function grantTopupCredits(userId: string, paymentIntentId: string) {
  const [existing] = await db
    .select({ n: count() })
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.description, `Auto top-up: ${paymentIntentId}`));
  if ((existing?.n ?? 0) > 0) {
    console.log(`Credits already granted for payment_intent ${paymentIntentId}`);
    return;
  }
  await db.insert(creditLedgerTable).values({
    userId,
    amount: TOPUP_CREDITS,
    type: "stripe_purchase",
    description: `Auto top-up: ${paymentIntentId}`,
  });
  console.log(`Granted ${TOPUP_CREDITS} top-up credits to user ${userId}`);
}

// Attempt an off-session $25 charge on the customer's saved card
export async function triggerAutoTopup(userId: string, customerId: string): Promise<boolean> {
  try {
    const stripe = await getUncachableStripeClient();

    // Get customer's default payment method
    const customer = await stripe.retrieveCustomer(customerId);
    const defaultPm = customer?.invoice_settings?.default_payment_method
      ?? customer?.default_source;

    if (!defaultPm) {
      // Try listing payment methods
      const pms = await stripe.listPaymentMethods(customerId);
      const pmList = pms?.data ?? [];
      if (pmList.length === 0) {
        console.warn(`No payment method on file for customer ${customerId}`);
        return false;
      }
      const pmId = pmList[0].id;
      return await chargeTopup(stripe, userId, customerId, pmId);
    }

    return await chargeTopup(stripe, userId, customerId,
      typeof defaultPm === "string" ? defaultPm : defaultPm.id);
  } catch (err: any) {
    console.error("Auto top-up failed:", err.message);
    return false;
  }
}

async function chargeTopup(stripe: any, userId: string, customerId: string, paymentMethodId: string): Promise<boolean> {
  const pi = await stripe.createPaymentIntent({
    amount: TOPUP_AMOUNT_CENTS,
    currency: "usd",
    customer: customerId,
    payment_method: paymentMethodId,
    confirm: true,
    off_session: true,
    metadata: { type: "auto_topup", userId },
  });

  if (pi.status === "succeeded") {
    await grantTopupCredits(userId, pi.id);
    console.log(`Auto top-up succeeded: ${pi.id}`);
    return true;
  }

  console.warn(`Auto top-up PaymentIntent status: ${pi.status} — will await webhook`);
  return false;
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

  await ensureFreeCredits(req.user.id);
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
          pr.currency,
          pr.recurring
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
            recurring: price.recurring,
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

// Get current user's subscription status
router.get("/credits/subscription", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id));
  if (!user?.stripeCustomerId) {
    res.json({ subscribed: false });
    return;
  }
  try {
    const result = await db.execute(sql`
      SELECT status FROM stripe.subscriptions
      WHERE customer = ${user.stripeCustomerId}
        AND status IN ('active', 'trialing')
      LIMIT 1
    `);
    const sub = (result.rows as any[])[0];
    res.json({ subscribed: !!sub, status: sub?.status ?? null });
  } catch {
    res.json({ subscribed: false });
  }
});

// Expose publishable key so the frontend can initialise Stripe.js
router.get("/credits/config", (req, res) => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? null;
  res.json({ publishableKey });
});

router.post("/credits/checkout", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { priceId, embedded } = req.body;
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

    const isSubscription = priceId === MONTHLY_PRICE_ID;
    const mode = isSubscription ? "subscription" : "payment";

    let sessionParams: any;

    if (embedded) {
      // Embedded checkout — stays on our site; no payment_method_types allowed
      sessionParams = {
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode,
        ui_mode: "embedded",
        return_url: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        metadata: { userId },
      };
    } else {
      sessionParams = {
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode,
        success_url: `${baseUrl}/?payment=success`,
        cancel_url: `${baseUrl}/?payment=cancelled`,
        metadata: { userId },
      };
    }

    if (isSubscription) {
      sessionParams.subscription_data = { metadata: { userId } };
    }

    const session = await stripe.createCheckoutSession(sessionParams);

    if (embedded) {
      res.json({ clientSecret: session.client_secret });
    } else {
      res.json({ url: session.url });
    }
  } catch (err: any) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
