import { getUncachableStripeClient } from "./stripeClient";

async function createCreditPacks() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log("Creating Pronto App credit pack products in Stripe...");

    const existing = await stripe.products.search({
      query: "name:'Pronto Credits - Starter Pack' AND active:'true'",
    });

    if (existing.data.length > 0) {
      console.log("Credit pack products already exist. Listing them:");
      for (const p of existing.data) {
        const prices = await stripe.prices.list({ product: p.id, active: true });
        console.log(`  ${p.name} (${p.id}) - prices: ${prices.data.map(pr => `$${pr.unit_amount! / 100} => ${pr.id}`).join(", ")}`);
      }
      return;
    }

    const starterProduct = await stripe.products.create({
      name: "Pronto Credits - Starter Pack",
      description: "500,000 AI credits for building apps with Pronto",
      metadata: { credits: "500000", pack: "starter" },
    });
    const starterPrice = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 500,
      currency: "usd",
    });
    console.log(`Created Starter Pack: ${starterProduct.id} / price: ${starterPrice.id} ($5.00)`);

    const proProduct = await stripe.products.create({
      name: "Pronto Credits - Pro Pack",
      description: "2,000,000 AI credits for power users of Pronto",
      metadata: { credits: "2000000", pack: "pro" },
    });
    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 1500,
      currency: "usd",
    });
    console.log(`Created Pro Pack: ${proProduct.id} / price: ${proPrice.id} ($15.00)`);

    console.log("\nCredit packs created successfully!");
    console.log("Webhooks will sync this data to your database automatically.");
  } catch (error: any) {
    console.error("Error creating credit packs:", error.message);
    process.exit(1);
  }
}

createCreditPacks();
