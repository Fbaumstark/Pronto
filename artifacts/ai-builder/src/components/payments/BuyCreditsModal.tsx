import { useState, useEffect } from "react";
import { X, Loader2, ShoppingCart, ExternalLink } from "lucide-react";
import { EmbeddedCheckoutModal } from "./EmbeddedCheckoutModal";
import { api } from "@/lib/api-base";

const PAYMENT_LINK_URL = import.meta.env.VITE_STRIPE_PAYMENT_LINK_URL as string | undefined;

interface CreditProduct {
  product_id: string;
  product_name: string;
  product_description: string;
  product_metadata: Record<string, string>;
  price_id: string;
  unit_amount: number;
  currency: string;
}

interface Props {
  onClose: () => void;
  heading?: string;
  subheading?: string;
}

export function BuyCreditsModal({ onClose, heading = "Buy Credits", subheading }: Props) {
  const [products, setProducts] = useState<CreditProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ priceId: string; productName: string } | null>(null);

  useEffect(() => {
    api("/api/credits/products")
      .then((r) => r.json())
      .then((d) => { setProducts(d.data ?? []); setLoading(false); })
      .catch(() => { setError("Failed to load credit packs"); setLoading(false); });
  }, []);

  if (checkout) {
    return (
      <EmbeddedCheckoutModal
        priceId={checkout.priceId}
        productName={checkout.productName}
        onClose={() => setCheckout(null)}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80 max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-foreground">{heading}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {subheading && (
          <p className="text-xs text-muted-foreground mb-4">{subheading}</p>
        )}

        {!subheading && <div className="mb-4" />}

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive text-center py-4">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No credit packs available yet.
          </div>
        )}

        <div className="space-y-3">
          {products.map((p) => {
            const credits = parseInt(p.product_metadata?.credits ?? "0");
            const price = p.unit_amount / 100;
            const isRecurring = p.product_metadata?.interval === "month" || p.product_name?.toLowerCase().includes("month");
            return (
              <div key={p.price_id} className="border border-border/60 rounded-xl p-4 hover:border-primary/50 hover:bg-primary/5 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.product_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {credits > 0 ? `${credits.toLocaleString()} AI credits` : p.product_description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">${price.toFixed(0)}</span>
                    {isRecurring && <p className="text-[10px] text-muted-foreground">/month</p>}
                  </div>
                </div>
                <button
                  onClick={() => setCheckout({ priceId: p.price_id, productName: p.product_name })}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Subscribe & Pay
                </button>
              </div>
            );
          })}
        </div>

        {PAYMENT_LINK_URL && (
          <div className="mt-3 pt-3 border-t border-border/40">
            <a
              href={PAYMENT_LINK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Pay via Stripe checkout page
            </a>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          Your card never leaves this site — secured by Stripe
        </p>
      </div>
    </div>
  );
}
