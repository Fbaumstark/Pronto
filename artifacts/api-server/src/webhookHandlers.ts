import { getStripeSync, hasStripeSync, getUncachableStripeClient } from "./lib/stripeClient";
import { db, creditLedgerTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { grantSubscriptionCredits, grantTopupCredits } from "./routes/credits";

async function getUserIdForCustomer(customerId: string): Promise<string | null> {
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.stripeCustomerId, customerId));
  return user?.id ?? null;
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email));
  return user?.id ?? null;
}

async function addCreditsForCheckout(sessionId: string) {
  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.retrieveCheckoutSession(sessionId);

    // Primary: userId embedded in session metadata (in-app checkout flow)
    // Fallback: look up by email (Stripe Payment Link flow — no userId in metadata)
    let userId = session.metadata?.userId ?? null;
    if (!userId) {
      const email = session.customer_details?.email ?? session.customer_email ?? null;
      if (email) {
        userId = await getUserIdByEmail(email);
        if (userId) {
          console.log(`[webhook] Resolved userId by email (payment link flow): ${email}`);
        }
      }
    }
    if (!userId) {
      console.warn("Could not identify user for checkout session:", sessionId,
        "— no userId in metadata and no matching email in DB.");
      return;
    }

    // Subscription checkout — first invoice handled by invoice.payment_succeeded
    if (session.mode === "subscription") {
      console.log("Subscription checkout completed — credits will be granted via invoice webhook");
      return;
    }

    let creditsToAdd = 0;
    for (const item of session.line_items?.data ?? []) {
      const product = item.price?.product as any;
      const credits = parseInt(product?.metadata?.credits ?? "0");
      creditsToAdd += credits * (item.quantity ?? 1);
    }

    if (creditsToAdd <= 0) {
      console.warn("No credits found in product metadata for session:", sessionId);
      return;
    }

    await db.insert(creditLedgerTable).values({
      userId,
      amount: creditsToAdd,
      type: "stripe_purchase",
      description: `Purchased ${creditsToAdd.toLocaleString()} credits`,
    });

    console.log(`Added ${creditsToAdd} credits to user ${userId}`);
  } catch (err) {
    console.error("Error adding credits for payment:", err);
    throw err;
  }
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
        "Received type: " + typeof payload + ". " +
        "FIX: Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }

    const canSync = await hasStripeSync();
    if (!canSync) {
      console.warn("Stripe sync not configured (STRIPE_SECRET_KEY missing). Skipping webhook processing.");
      return;
    }

    const sync = await getStripeSync();

    let sessionId: string | null = null;
    let isCheckoutCompleted = false;
    let invoiceEvent: any = null;
    let topupPaymentIntent: any = null;

    try {
      const secretResult = await sync.postgresClient.query(
        `SELECT secret FROM "stripe"."_managed_webhooks" LIMIT 1`
      );
      const secret = secretResult?.rows?.[0]?.secret;
      if (secret) {
        const stripeClient = await getUncachableStripeClient();
        const event = await stripeClient.webhooks?.constructEventAsync(payload, signature, secret);

        if (event?.type === "checkout.session.completed") {
          const session = event.data.object as any;
          if (session.payment_status === "paid" || session.mode === "subscription") {
            sessionId = session.id;
            isCheckoutCompleted = true;
          }
        }

        // Subscription renewal — grant monthly credits
        if (event?.type === "invoice.payment_succeeded") {
          const invoice = event.data.object as any;
          if (invoice.billing_reason === "subscription_cycle" || invoice.billing_reason === "subscription_create") {
            invoiceEvent = invoice;
          }
        }

        // Auto top-up payment succeeded
        if (event?.type === "payment_intent.succeeded") {
          const pi = event.data.object as any;
          if (pi.metadata?.type === "auto_topup") {
            topupPaymentIntent = pi;
          }
        }
      }
    } catch (err) {
      console.error("Could not parse event for custom handling:", err);
    }

    await sync.processWebhook(payload, signature);

    if (isCheckoutCompleted && sessionId) {
      await addCreditsForCheckout(sessionId);
    }

    if (invoiceEvent) {
      const customerId = invoiceEvent.customer;
      let userId = invoiceEvent.subscription_details?.metadata?.userId
        ?? invoiceEvent.metadata?.userId;
      if (!userId && customerId) {
        userId = await getUserIdForCustomer(customerId);
      }
      if (userId) {
        await grantSubscriptionCredits(userId, invoiceEvent.id);
      } else {
        console.warn("Could not find userId for subscription invoice:", invoiceEvent.id);
      }
    }

    if (topupPaymentIntent) {
      const userId = topupPaymentIntent.metadata?.userId;
      if (userId) {
        await grantTopupCredits(userId, topupPaymentIntent.id);
      }
    }
  }
}
