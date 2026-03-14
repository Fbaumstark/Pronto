import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Users, DollarSign, Zap, ArrowLeft, TrendingUp,
  ChevronUp, ChevronDown, Search, RefreshCw,
  Settings, Key, CheckCircle2, AlertCircle, Loader2,
  Eye, EyeOff, Globe, BarChart3, Activity, Hash,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { ProntoLogoMark, ProntoTagline } from "@/components/ProntoLogo";
import { formatDistanceToNow, format } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

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

function AIProviderPanel() {
  const [provider, setProvider] = useState<"replit" | "own">("replit");
  const [hasOwnKey, setHasOwnKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { setProvider(d.provider); setHasOwnKey(d.hasOwnApiKey); })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (provider === "own" && !apiKey.trim() && !hasOwnKey) {
      setErrorMsg("Enter your Anthropic API key first."); setStatus("error"); return;
    }
    setSaving(true); setStatus("idle"); setErrorMsg("");
    try {
      const body: any = { provider };
      if (provider === "own" && apiKey.trim()) body.ownApiKey = apiKey.trim();
      const res = await fetch("/api/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setHasOwnKey(d.hasOwnApiKey); setApiKey(""); setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error"); setErrorMsg("Failed to save. Try again.");
    } finally { setSaving(false); }
  };

  const clearKey = async () => {
    if (!confirm("Remove Anthropic key and switch back to Replit AI?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "replit", ownApiKey: "" }),
      });
      if (!res.ok) throw new Error();
      setProvider("replit"); setHasOwnKey(false); setApiKey("");
      setStatus("success"); setTimeout(() => setStatus("idle"), 3000);
    } catch { setErrorMsg("Failed to remove key."); setStatus("error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">AI Provider</h2>
          <p className="text-xs text-muted-foreground">Choose which API processes all AI builds</p>
        </div>
        {!loading && (
          <div className={`ml-auto flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
            provider === "own"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-primary/10 border-primary/20 text-primary"
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {provider === "own" ? "Direct Anthropic" : "Replit AI"}
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Provider toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setProvider("replit")}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  provider === "replit" ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-border/80"
                }`}
              >
                <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${provider === "replit" ? "bg-primary/20" : "bg-muted"}`}>
                  <Zap className={`w-4 h-4 ${provider === "replit" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">Replit AI Integration</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">2.5× markup</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">No key needed. Replit bills you at 2.5× Anthropic's rate. Zero setup.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sonnet: <span className="text-foreground font-mono">$7.50 / $37.50</span> per 1M tokens</p>
                </div>
                {provider === "replit" && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
              </button>

              <button
                onClick={() => setProvider("own")}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  provider === "own" ? "border-green-500/60 bg-green-500/5" : "border-border bg-muted/20 hover:border-border/80"
                }`}
              >
                <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${provider === "own" ? "bg-green-500/20" : "bg-muted"}`}>
                  <Key className={`w-4 h-4 ${provider === "own" ? "text-green-400" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">Direct Anthropic API</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">60% cheaper</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Your own key. Billed by Anthropic at published rates.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sonnet: <span className="text-foreground font-mono">$3.00 / $15.00</span> per 1M tokens</p>
                </div>
                {provider === "own" && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />}
              </button>
            </div>

            {/* API key input — shown when "own" selected */}
            {provider === "own" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Anthropic API Key</label>
                {hasOwnKey && (
                  <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    A key is saved and active. Enter a new one to replace it.
                  </div>
                )}
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={hasOwnKey ? "Enter new key to replace…" : "sk-ant-…"}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 pr-10 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Get your key at console.anthropic.com
                  </a>
                  {hasOwnKey && (
                    <button onClick={clearKey} disabled={saving} className="text-xs text-destructive hover:underline">
                      Remove key → switch to Replit AI
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Cost comparison callout */}
            <div className="bg-muted/30 border border-border/50 rounded-xl p-4 text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-2">Cost comparison (Claude Sonnet, per 1M output tokens)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Replit AI</p>
                  <p className="text-foreground font-mono">$37.50 cost to you</p>
                  <p className="text-muted-foreground">$75.00 charged to user</p>
                  <p className="text-amber-400 font-semibold">~50% margin</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Direct Anthropic</p>
                  <p className="text-foreground font-mono">$15.00 cost to you</p>
                  <p className="text-muted-foreground">$75.00 charged to user</p>
                  <p className="text-green-400 font-semibold">~80% margin</p>
                </div>
              </div>
            </div>

            {status === "error" && errorMsg && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{errorMsg}
              </div>
            )}
            {status === "success" && (
              <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />Provider settings saved.
              </div>
            )}

            <button
              onClick={save}
              disabled={saving}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save provider settings"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── period helpers ─────────────────────────────────────────────────
const PERIODS = [
  { key: "day",    label: "Today" },
  { key: "week",   label: "7 Days" },
  { key: "month",  label: "30 Days" },
  { key: "year",   label: "1 Year" },
  { key: "3year",  label: "3 Years" },
  { key: "5year",  label: "5 Years" },
] as const;

type Period = typeof PERIODS[number]["key"];

interface AICostsData {
  period: string;
  timeseries: { bucket: string; provider: string; generations: number; input_tokens: string; output_tokens: string; cost_usd: number; credits_charged: string }[];
  summary: { provider: string; generations: number; input_tokens: string; output_tokens: string; cost_usd: number; credits_charged: string }[];
  topUsers: { id: string; email: string; first_name: string; generations: number; cost_usd: number; credits_charged: string }[];
  allTime: { generations: number; input_tokens: string; output_tokens: string; cost_usd: number; credits_charged: string };
}

function fmt$(n: number) { return n < 0.01 ? `<$0.01` : `$${n.toFixed(n >= 1 ? 2 : 4)}`; }
function fmtNum(n: number | string) { return Number(n).toLocaleString(); }
function fmtTokens(n: number | string) {
  const v = Number(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

// Merge timeseries rows by bucket, splitting provider data
function buildChartData(timeseries: AICostsData["timeseries"]) {
  const map = new Map<string, any>();
  for (const row of timeseries) {
    const key = row.bucket;
    if (!map.has(key)) map.set(key, { bucket: key, replit: 0, own: 0, total: 0, replit_gen: 0, own_gen: 0 });
    const entry = map.get(key)!;
    const cost = Number(row.cost_usd ?? 0);
    if (row.provider === "own") { entry.own += cost; entry.own_gen += row.generations; }
    else { entry.replit += cost; entry.replit_gen += row.generations; }
    entry.total += cost;
  }
  return Array.from(map.values()).map((e) => ({
    ...e,
    label: new Date(e.bucket).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    replit: parseFloat(e.replit.toFixed(4)),
    own: parseFloat(e.own.toFixed(4)),
    total: parseFloat(e.total.toFixed(4)),
  }));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/70 rounded-xl shadow-xl p-3 text-xs space-y-1.5">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.dataKey === "replit" ? "Replit AI" : p.dataKey === "own" ? "Direct API" : "Total"}</span>
          <span className="ml-auto font-mono text-foreground">{fmt$(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function AICostsPanel() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<AICostsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/ai-costs?period=${period}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [period]);

  const chartData = data ? buildChartData(data.timeseries) : [];
  const replitSummary = data?.summary.find((s) => s.provider === "replit");
  const ownSummary = data?.summary.find((s) => s.provider === "own");
  const totalCost = (Number(replitSummary?.cost_usd ?? 0) + Number(ownSummary?.cost_usd ?? 0));
  const totalGen = (Number(replitSummary?.generations ?? 0) + Number(ownSummary?.generations ?? 0));
  const totalTokens = (Number(replitSummary?.output_tokens ?? 0) + Number(ownSummary?.output_tokens ?? 0));

  const hasData = data && (data.timeseries.length > 0 || data.summary.length > 0);

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
          <BarChart3 className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">AI Cost Analytics</h2>
          <p className="text-xs text-muted-foreground">Actual API costs for every generation</p>
        </div>
        {/* All-time total */}
        {data?.allTime && Number(data.allTime.cost_usd) > 0 && (
          <div className="ml-auto text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">All-time cost</p>
            <p className="text-sm font-bold text-foreground">{fmt$(Number(data.allTime.cost_usd))}</p>
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Period selector */}
        <div className="flex gap-1.5 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                period === p.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasData ? (
          <div className="text-center py-12 space-y-2">
            <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">No AI usage recorded yet</p>
            <p className="text-xs text-muted-foreground/60">Data will appear here after the first AI generation runs.</p>
          </div>
        ) : (
          <>
            {/* Summary stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">API Cost</p>
                <p className="text-xl font-bold text-foreground">{fmt$(totalCost)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">this {PERIODS.find(p=>p.key===period)?.label.toLowerCase()}</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Generations</p>
                <p className="text-xl font-bold text-foreground">{fmtNum(totalGen)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">AI builds run</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Output Tokens</p>
                <p className="text-xl font-bold text-foreground">{fmtTokens(totalTokens)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">tokens generated</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Avg Cost/Gen</p>
                <p className="text-xl font-bold text-foreground">{totalGen > 0 ? fmt$(totalCost / totalGen) : "$0"}</p>
                <p className="text-[10px] text-muted-foreground mt-1">per generation</p>
              </div>
            </div>

            {/* Provider breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Replit AI", key: "replit", data: replitSummary, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
                { label: "Direct Anthropic", key: "own", data: ownSummary, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
              ].map(({ label, data: sd, color, bg, border }) => (
                <div key={label} className={`${bg} border ${border} rounded-xl p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-xs font-bold ${color}`}>{label}</p>
                    {sd ? <p className={`text-sm font-bold ${color}`}>{fmt$(Number(sd.cost_usd))}</p> : <p className="text-xs text-muted-foreground">No usage</p>}
                  </div>
                  {sd && (
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                      <div><span className="block text-foreground font-semibold">{fmtNum(sd.generations)}</span>generations</div>
                      <div><span className="block text-foreground font-semibold">{fmtTokens(sd.input_tokens)}</span>in tokens</div>
                      <div><span className="block text-foreground font-semibold">{fmtTokens(sd.output_tokens)}</span>out tokens</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Cost over time chart */}
            {chartData.length > 0 && (
              <div className="bg-muted/20 rounded-xl p-4 border border-border/40">
                <p className="text-xs font-semibold text-foreground mb-4">API Cost Over Time</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradReplit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradOwn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(2)}`} width={48} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} formatter={(v) => v === "replit" ? "Replit AI" : "Direct API"} />
                    <Area type="monotone" dataKey="replit" stroke="#8b5cf6" fill="url(#gradReplit)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="own" stroke="#34d399" fill="url(#gradOwn)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Generations per day chart */}
            {chartData.length > 0 && (
              <div className="bg-muted/20 rounded-xl p-4 border border-border/40">
                <p className="text-xs font-semibold text-foreground mb-4">Generations Over Time</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} width={32} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} formatter={(v) => v === "replit_gen" ? "Replit AI" : "Direct API"} />
                    <Bar dataKey="replit_gen" stackId="a" fill="#8b5cf6" radius={[0,0,0,0]} />
                    <Bar dataKey="own_gen" stackId="a" fill="#34d399" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top users */}
            {data.topUsers.length > 0 && (
              <div className="bg-muted/20 rounded-xl border border-border/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/40">
                  <p className="text-xs font-semibold text-foreground">Top Users by Cost</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">User</th>
                        <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Generations</th>
                        <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">API Cost</th>
                        <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Credits Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topUsers.map((u, i) => (
                        <tr key={u.id} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                          <td className="px-4 py-2.5 text-foreground font-medium truncate max-w-[180px]">{u.email ?? u.first_name ?? "—"}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtNum(u.generations)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">{fmt$(Number(u.cost_usd))}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtNum(Number(u.credits_charged))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* All-time summary */}
            {data.allTime && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-border/30">
                {[
                  { label: "All-time API cost", value: fmt$(Number(data.allTime.cost_usd)), icon: DollarSign },
                  { label: "All-time generations", value: fmtNum(Number(data.allTime.generations)), icon: Activity },
                  { label: "All-time input tokens", value: fmtTokens(data.allTime.input_tokens), icon: Hash },
                  { label: "All-time output tokens", value: fmtTokens(data.allTime.output_tokens), icon: Hash },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-base font-bold text-muted-foreground/80 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2 sm:gap-4">
          <button onClick={() => setLocation("/")} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <ProntoLogoMark size={26} className="shrink-0" />
          <div className="min-w-0">
            <span className="text-sm font-bold text-foreground leading-none block">Pronto</span>
            <ProntoTagline className="hidden sm:block" />
          </div>
          <div className="h-4 border-l border-border/50 mx-0.5 sm:mx-1 shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground shrink-0">Admin</span>
          <div className="ml-auto shrink-0">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border/50 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── AI Provider Settings ── */}
        <AIProviderPanel />

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

        {/* ── AI Cost Analytics ── */}
        <AICostsPanel />

      </div>
    </div>
  );
}
