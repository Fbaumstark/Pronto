import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";
import { ReplitConnectors } from "@replit/connectors-sdk";

let stripeSyncInstance: StripeSync | null = null;

async function getStripeSecretKey(): Promise<string | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (key) return key;
  return null;
}

class ProxiedStripe {
  private connectors: ReplitConnectors;

  constructor() {
    this.connectors = new ReplitConnectors();
  }

  private async proxyRequest(path: string, method: string = "GET", body?: Record<string, any>) {
    const options: any = { method };
    if (body) {
      const formData = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) {
        if (v !== undefined && v !== null) formData.append(k, String(v));
      }
      options.body = formData.toString();
      options.headers = { "Content-Type": "application/x-www-form-urlencoded" };
    }
    const response = await this.connectors.proxy("stripe", path, options);
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`Stripe API error: ${err?.error?.message ?? response.statusText}`);
    }
    return response.json();
  }

  async createCustomer(params: { email?: string; metadata?: Record<string, string> }) {
    const body: Record<string, any> = {};
    if (params.email) body.email = params.email;
    if (params.metadata) {
      for (const [k, v] of Object.entries(params.metadata)) {
        body[`metadata[${k}]`] = v;
      }
    }
    return this.proxyRequest("/v1/customers", "POST", body);
  }

  async createCheckoutSession(params: {
    customer: string;
    payment_method_types: string[];
    line_items: Array<{ price: string; quantity: number }>;
    mode: string;
    success_url: string;
    cancel_url: string;
    metadata?: Record<string, string>;
  }) {
    const body: Record<string, any> = {
      customer: params.customer,
      mode: params.mode,
      success_url: params.success_url,
      cancel_url: params.cancel_url,
    };
    params.payment_method_types.forEach((t, i) => {
      body[`payment_method_types[${i}]`] = t;
    });
    params.line_items.forEach((item, i) => {
      body[`line_items[${i}][price]`] = item.price;
      body[`line_items[${i}][quantity]`] = item.quantity;
    });
    if (params.metadata) {
      for (const [k, v] of Object.entries(params.metadata)) {
        body[`metadata[${k}]`] = v;
      }
    }
    return this.proxyRequest("/v1/checkout/sessions", "POST", body);
  }

  async retrieveCheckoutSession(sessionId: string) {
    return this.proxyRequest(`/v1/checkout/sessions/${sessionId}?expand[]=line_items.data.price.product`);
  }

  async listProductsWithPrices(): Promise<{ products: any[]; prices: any[] }> {
    const [productsResp, pricesResp] = await Promise.all([
      this.proxyRequest("/v1/products?active=true&limit=20"),
      this.proxyRequest("/v1/prices?active=true&limit=100"),
    ]);
    return { products: productsResp.data ?? [], prices: pricesResp.data ?? [] };
  }
}

export async function getUncachableStripeClient(): Promise<any> {
  const secretKey = await getStripeSecretKey();
  if (secretKey) {
    return new Stripe(secretKey);
  }
  return new ProxiedStripe();
}

export async function getStripeSync(): Promise<StripeSync> {
  if (stripeSyncInstance) return stripeSyncInstance;
  const secretKey = await getStripeSecretKey();
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY environment variable is required for webhook sync. " +
      "Please add your Stripe secret key to the project secrets."
    );
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");
  stripeSyncInstance = new StripeSync({
    stripeSecretKey: secretKey,
    poolConfig: { connectionString: databaseUrl },
  });
  return stripeSyncInstance;
}

export async function hasStripeSync(): Promise<boolean> {
  return !!(await getStripeSecretKey());
}
