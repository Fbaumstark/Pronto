import Stripe from "stripe";

async function setup() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) { console.error("STRIPE_SECRET_KEY not set"); process.exit(1); }
  const stripe = new Stripe(key);

  // Archive all existing Pronto credit products
  const existing = await stripe.products.list({ active: true, limit: 50 });
  for (const p of existing.data) {
    if (p.name.includes("Pronto")) {
      const prices = await stripe.prices.list({ product: p.id, active: true });
      for (const pr of prices.data) {
        await stripe.prices.update(pr.id, { active: false });
        console.log(`Archived price ${pr.id} for ${p.name}`);
      }
      await stripe.products.update(p.id, { active: false });
      console.log(`Archived product ${p.name}`);
    }
  }

  // Create Monthly Base Plan — $10/month → 500,000 credits
  const monthlyProduct = await stripe.products.create({
    name: "Pronto Monthly Plan",
    description: "500,000 AI credits per month. Auto-renews. When credits run out, auto top-up in $25 increments.",
    metadata: { credits: "500000", type: "subscription" },
  });
  const monthlyPrice = await stripe.prices.create({
    product: monthlyProduct.id,
    unit_amount: 1000, // $10.00
    currency: "usd",
    recurring: { interval: "month" },
  });
  console.log(`✅ Monthly Plan: ${monthlyProduct.id} / price: ${monthlyPrice.id} ($10/month)`);

  // Create Auto Top-up Pack — $25 one-time → 1,250,000 credits
  const topupProduct = await stripe.products.create({
    name: "Pronto Auto Top-up",
    description: "1,250,000 AI credits. Automatically charged when your balance runs out.",
    metadata: { credits: "1250000", type: "topup" },
  });
  const topupPrice = await stripe.prices.create({
    product: topupProduct.id,
    unit_amount: 2500, // $25.00
    currency: "usd",
  });
  console.log(`✅ Auto Top-up: ${topupProduct.id} / price: ${topupPrice.id} ($25 one-time)`);

  console.log("\nSave these for your .env or config:");
  console.log(`TOPUP_PRICE_ID=${topupPrice.id}`);
  console.log(`MONTHLY_PRICE_ID=${monthlyPrice.id}`);
}

setup().catch((e) => { console.error(e.message); process.exit(1); });
