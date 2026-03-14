import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Zap, Rocket, Bot, RefreshCw, TrendingDown,
  Gift, ShoppingCart, Check, ChevronRight, Info,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ProntoLogoMark, ProntoTagline } from "@/components/ProntoLogo";

interface BreakdownItem {
  type: string;
  count: number;
  total: number;
}

interface HistoryEntry {
  id: number;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface UsageData {
  balance: number | null;
  unlimited: boolean;
  thisMonthUsed: number;
  breakdown: BreakdownItem[];
  creditCosts: Record<string, number>;
  history: HistoryEntry[];
}

const FREE_CREDITS = 50_000;

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  ai_generation: {
    label: "AI Generation",
    icon: <Bot className="w-4 h-4" />,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  deployment: {
    label: "Deployment",
    icon: <Rocket className="w-4 h-4" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  signup_bonus: {
    label: "Signup bonus",
    icon: <Gift className="w-4 h-4" />,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  stripe_purchase: {
    label: "Credit purchase",
    icon: <ShoppingCart className="w-4 h-4" />,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
};

function typeMeta(type: string) {
  return (
    TYPE_META[type] ?? {
      label: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      icon: <Zap className="w-4 h-4" />,
      color: "text-muted-foreground",
      bg: "bg-muted/40",
    }
  );
}

function creditValue(credits: number): string {
  // $25 per 1.25M credits → $0.00002 per credit
  const dollars = (credits / 500_000) * 10;
  if (dollars < 0.01) return `<$0.01`;
  return `$${dollars.toFixed(2)}`;
}

function BalanceRing({ balance, max }: { balance: number; max: number }) {
  const pct = Math.min(1, Math.max(0, balance / max));
  const r = 40;
  const circ = 2 * Math.PI * r;
  const used = circ * (1 - pct);
  const color =
    pct > 0.4 ? "#7c3aed" : pct > 0.15 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="100" height="100" className="shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e1e2e" strokeWidth="10" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={circ}
        strokeDashoffset={used}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="50" y="46" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">
        {balance >= 1000 ? `${Math.round(balance / 1000)}k` : balance}
      </text>
      <text x="50" y="61" textAnchor="middle" fill="#888" fontSize="9">
        credits
      </text>
    </svg>
  );
}

export function UsagePage() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/usage", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      setData(await res.json());
    } catch {
      setError("Could not load usage data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const balance = data?.balance ?? 0;
  const aiUsage = data?.breakdown.find((b) => b.type === "ai_generation");
  const deployUsage = data?.breakdown.find((b) => b.type === "deployment");
  const visibleHistory = showAll ? (data?.history ?? []) : (data?.history ?? []).slice(0, 15);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-card/80 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <ProntoLogoMark size={26} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-foreground leading-none block">Pronto</span>
            <ProntoTagline className="hidden sm:block" />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {loading && !data ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">{error}</div>
        ) : data ? (
          <>
            {/* ── OVERVIEW ── */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Usage overview
              </h2>

              <div className="space-y-3">
                {/* Balance card */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 flex items-center gap-5">
                  {data.unlimited ? (
                    <div className="w-[100px] h-[100px] rounded-full border-[10px] border-primary/40 flex items-center justify-center shrink-0">
                      <span className="text-2xl">∞</span>
                    </div>
                  ) : (
                    <BalanceRing balance={balance} max={FREE_CREDITS} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground mb-1">
                      {data.unlimited ? "Unlimited credits" : `${balance.toLocaleString()} credits remaining`}
                    </p>
                    {data.unlimited ? (
                      <p className="text-xs text-muted-foreground">
                        Unlimited access · usage is tracked below so you can gauge real-world costs.
                      </p>
                    ) : (
                      <>
                        <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                          <div
                            className="h-1.5 rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, (balance / FREE_CREDITS) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {((balance / FREE_CREDITS) * 100).toFixed(1)}% of {FREE_CREDITS.toLocaleString()} base credits remaining
                        </p>
                        <button
                          onClick={() => setLocation("/?buy=true")}
                          className="mt-2 text-xs text-primary hover:underline font-medium"
                        >
                          Buy more credits →
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* This month */}
                <div className="bg-card border border-border/60 rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Credits used this month</p>
                      <p className="text-2xl font-bold text-foreground">
                        {data.thisMonthUsed.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ≈ {creditValue(data.thisMonthUsed)} in AI compute
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-orange-400" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── PRICING REFERENCE ── */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Credit costs
              </h2>
              <div className="bg-card border border-border/60 rounded-2xl divide-y divide-border/40">
                {[
                  {
                    icon: <Bot className="w-4 h-4 text-violet-400" />,
                    label: "AI generation",
                    sub: "5× Anthropic cost · scales with prompt & response size",
                    cost: null as number | null,
                  },
                  {
                    icon: <Rocket className="w-4 h-4 text-blue-400" />,
                    label: "New deployment",
                    sub: "First time you publish a project to a public URL",
                    cost: 10_000 as number | null,
                  },
                  {
                    icon: <RefreshCw className="w-4 h-4 text-sky-400" />,
                    label: "Redeploy",
                    sub: "Push updates to an already-published project",
                    cost: 2_000 as number | null,
                  },
                ].map(({ icon, label, sub, cost }) => (
                  <div key={label} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">{sub}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      {cost === null ? (
                        <>
                          <p className="text-sm font-bold text-violet-400">Variable</p>
                          <p className="text-[11px] text-muted-foreground">per request</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-foreground">{cost.toLocaleString()}</p>
                          <p className="text-[11px] text-muted-foreground">credits</p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── RESOURCE BREAKDOWN ── */}
            {data.breakdown.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                  All-time resource usage
                </h2>
                <div className="bg-card border border-border/60 rounded-2xl divide-y divide-border/40">
                  {data.breakdown.map((item) => {
                    const meta = typeMeta(item.type);
                    return (
                      <div key={item.type} className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
                            {meta.icon}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{meta.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.count.toLocaleString()} {item.count === 1 ? "event" : "events"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-bold text-foreground">{item.total.toLocaleString()}</p>
                          <p className="text-[11px] text-muted-foreground">credits</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── TRANSACTION HISTORY ── */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Transaction history
              </h2>

              {data.history.length === 0 ? (
                <div className="bg-card border border-border/60 rounded-2xl p-8 text-center text-sm text-muted-foreground">
                  No transactions yet.
                </div>
              ) : (
                <div className="bg-card border border-border/60 rounded-2xl divide-y divide-border/30">
                  {visibleHistory.map((entry) => {
                    const meta = typeMeta(entry.type);
                    const isCredit = entry.amount > 0;
                    return (
                      <div key={entry.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {entry.description ?? meta.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })} · {format(new Date(entry.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-bold shrink-0 ${isCredit ? "text-green-400" : "text-foreground"}`}
                        >
                          {isCredit ? "+" : ""}{entry.amount.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}

                  {data.history.length > 15 && (
                    <button
                      onClick={() => setShowAll((v) => !v)}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors rounded-b-2xl"
                    >
                      {showAll ? "Show less" : `Show all ${data.history.length} transactions`}
                      <ChevronRight className={`w-4 h-4 transition-transform ${showAll ? "rotate-90" : ""}`} />
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* ── FOOTER NOTE ── */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground pb-4">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>
                Credit costs reflect the compute resources used to generate your apps and host them publicly.
                1,000 credits ≈ {creditValue(1000)} in value.
                Subscription adds 1,250,000 credits/month for $25. Auto top-up adds 1,250,000 more credits for $25 when your balance reaches zero.
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
