import Stripe from "stripe";

export async function getUncachableStripeClient(): Promise<Stripe> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY environment variable is required");
  return new Stripe(key);
}
