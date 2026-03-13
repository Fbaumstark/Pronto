import { getStripeSync, hasStripeSync, getUncachableStripeClient } from "./lib/stripeClient";
import { db, creditLedgerTable } from "@workspace/db";

async function addCreditsForCheckout(sessionId: string) {
  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.retrieveCheckoutSession(sessionId);

    const userId = session.metadata?.userId;
    if (!userId) {
      console.warn("No userId in checkout session metadata:", sessionId);
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
          if (session.payment_status === "paid") {
            sessionId = session.id;
            isCheckoutCompleted = true;
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
  }
}
