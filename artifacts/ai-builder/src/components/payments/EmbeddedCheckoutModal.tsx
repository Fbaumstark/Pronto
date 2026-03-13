import { useEffect, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { X, Loader2, AlertCircle } from "lucide-react";

interface Props {
  priceId: string;
  productName: string;
  onClose: () => void;
}

export function EmbeddedCheckoutModal({ priceId, productName, onClose }: Props) {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch publishable key
    fetch("/api/credits/config")
      .then((r) => r.json())
      .then(({ publishableKey }) => {
        if (!publishableKey) {
          setError("Payment is not configured yet. Please contact support.");
          setLoading(false);
          return;
        }
        setStripePromise(loadStripe(publishableKey));
      })
      .catch(() => {
        setError("Could not load payment configuration.");
        setLoading(false);
      });
  }, []);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/credits/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId, embedded: true }),
    });
    const data = await res.json();
    if (!res.ok || !data.clientSecret) {
      throw new Error(data.error ?? "Failed to create checkout session");
    }
    setLoading(false);
    return data.clientSecret;
  }, [priceId]);

  useEffect(() => {
    if (!stripePromise) return;
    fetchClientSecret()
      .then(setClientSecret)
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [stripePromise, fetchClientSecret]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">{productName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Secure checkout powered by Stripe</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && !error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading secure checkout…</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Payment unavailable</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {stripePromise && clientSecret && (
            <div className="p-1">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
