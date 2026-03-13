import Stripe from "stripe";
import { ReplitConnectors } from "@replit/connectors-sdk";

async function getStripeSecretKey(): Promise<string> {
  try {
    const connectors = new ReplitConnectors();
    const connections = await connectors.listConnections({
      connector_names: "stripe",
      expand: ["settings"],
    });
    const conn = connections[0];
    if (conn) {
      const settings = (conn as any).settings ?? {};
      const key = settings.secret_key ?? settings.api_key ?? settings.secretKey;
      if (key) return key;
    }
  } catch (err) {
    console.warn("Could not fetch Stripe key via connectors SDK:", err);
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("No Stripe secret key available. Please connect the Stripe integration.");
  return key;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const secretKey = await getStripeSecretKey();
  return new Stripe(secretKey);
}
