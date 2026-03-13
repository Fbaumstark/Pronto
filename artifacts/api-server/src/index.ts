import { runMigrations } from "stripe-replit-sync";
import { getStripeSync, hasStripeSync } from "./lib/stripeClient";
import app from "./app";

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("DATABASE_URL not set — skipping Stripe init");
    return;
  }

  const hasKey = await hasStripeSync();
  if (!hasKey) {
    console.warn("STRIPE_SECRET_KEY not set — Stripe webhook sync disabled. Set STRIPE_SECRET_KEY to enable full Stripe integration.");
    return;
  }

  try {
    console.log("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    console.log("Stripe schema ready");

    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    console.log("Setting up managed webhook at:", `${webhookBaseUrl}/api/stripe/webhook`);
    const webhook = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`
    );
    console.log("Webhook configured:", webhook?.url ?? "setup complete");

    console.log("Syncing existing Stripe data...");
    stripeSync
      .syncBackfill()
      .then(() => console.log("Stripe data synced"))
      .catch((err) => console.error("Error syncing Stripe data:", err));
  } catch (error) {
    console.error("Failed to initialize Stripe (continuing without it):", error);
  }
}

async function main() {
  const rawPort = process.env["PORT"];

  if (!rawPort) {
    throw new Error("PORT environment variable is required but was not provided.");
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  await initStripe();

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
