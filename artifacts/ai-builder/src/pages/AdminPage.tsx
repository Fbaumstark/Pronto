import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Users, DollarSign, Zap, ArrowLeft, TrendingUp,
  ChevronUp, ChevronDown, Search, RefreshCw
} from "lucide-react";
import { ProntoLogoMark, ProntoTagline } from "@/components/ProntoLogo";
import { formatDistanceToNow, format } from "date-fns";

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  createdAt: string;
  creditsUsed: number;
  creditsReceived: number;
  totalSpentCents: number;
}

interface AdminStats {
  summary: {
    totalUsers: number;
    totalRevenueDollars: number;
    totalCreditsUsed: number;
  };
  users: AdminUser[];
}

type SortKey = "createdAt" | "creditsUsed" | "totalSpentCents" | "email";
type SortDir = "asc" | "desc";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function AdminPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth() as any;
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      if (res.status === 403) { setError("Access denied"); return; }
      if (!res.ok) throw new Error("Failed to load");
      setStats(await res.json());
    } catch {
      setError("Failed to load admin data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = (stats?.users ?? [])
    .filter((u) =>
      !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.firstName?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];
      if (sortKey === "email") { av = av ?? ""; bv = bv ?? ""; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40" />
    );

  if (error === "Access denied") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-4xl">🔒</p>
          <h2 className="text-xl font-bold text-foreground">Admin access only</h2>
          <p className="text-muted-foreground text-sm">You don't have permission to view this page.</p>
          <button onClick={() => setLocation("/")} className="text-primary text-sm hover:underline">← Back to dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => setLocation("/")} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <ProntoLogoMark size={28} />
          <div>
            <span className="text-sm font-bold text-foreground leading-none block">Pronto</span>
            <ProntoTagline />
          </div>
          <div className="h-4 border-l border-border/50 mx-1" />
          <div>
            <span className="text-xs font-semibold text-muted-foreground">Admin</span>
          </div>
          <div className="ml-auto">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border/50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {loading && !stats ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">{error}</div>
        ) : stats ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={Users}
                label="Total signups"
                value={stats.summary.totalUsers.toLocaleString()}
                sub="registered accounts"
                color="bg-blue-500/10 text-blue-400"
              />
              <StatCard
                icon={DollarSign}
                label="Total revenue"
                value={`$${stats.summary.totalRevenueDollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                sub="from Stripe charges"
                color="bg-green-500/10 text-green-400"
              />
              <StatCard
                icon={Zap}
                label="Credits consumed"
                value={stats.summary.totalCreditsUsed.toLocaleString()}
                sub="across all users"
                color="bg-primary/10 text-primary"
              />
            </div>

            {/* Average per paying user */}
            {stats.summary.totalRevenueDollars > 0 && (
              <div className="bg-gradient-to-r from-primary/5 to-violet-500/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-semibold">
                    ${(stats.summary.totalRevenueDollars / stats.summary.totalUsers).toFixed(2)}
                  </span>{" "}
                  average revenue per user ·{" "}
                  <span className="text-foreground font-semibold">
                    {Math.round(stats.summary.totalCreditsUsed / Math.max(stats.summary.totalUsers, 1)).toLocaleString()}
                  </span>{" "}
                  average credits used per user
                </p>
              </div>
            )}

            {/* Users table */}
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <h2 className="text-sm font-bold text-foreground">All users ({filtered.length})</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search email or name…"
                    className="bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-52"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      {[
                        { label: "User", key: "email" as SortKey },
                        { label: "Signed up", key: "createdAt" as SortKey },
                        { label: "Credits used", key: "creditsUsed" as SortKey },
                        { label: "Credits received", key: null },
                        { label: "Total spent", key: "totalSpentCents" as SortKey },
                      ].map(({ label, key }) => (
                        <th
                          key={label}
                          className={`text-left px-5 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap ${key ? "cursor-pointer select-none hover:text-foreground transition-colors" : ""}`}
                          onClick={() => key && handleSort(key)}
                        >
                          <div className="flex items-center gap-1">
                            {label}
                            {key && <SortIcon k={key} />}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => (
                      <tr key={u.id} className={`border-b border-border/30 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/5"}`}>
                        <td className="px-5 py-3">
                          <div>
                            <p className="font-medium text-foreground text-sm">{u.email ?? "—"}</p>
                            {u.firstName && <p className="text-xs text-muted-foreground">{u.firstName}</p>}
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div>
                            <p className="text-foreground text-xs font-mono">{format(new Date(u.createdAt), "MMM d, yyyy")}</p>
                            <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-sm font-semibold ${u.creditsUsed > 0 ? "text-orange-400" : "text-muted-foreground"}`}>
                            {u.creditsUsed.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm text-muted-foreground">
                            {u.creditsReceived.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {u.totalSpentCents > 0 ? (
                            <span className="text-sm font-bold text-green-400">
                              ${(u.totalSpentCents / 100).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">$0.00</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                          No users match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
