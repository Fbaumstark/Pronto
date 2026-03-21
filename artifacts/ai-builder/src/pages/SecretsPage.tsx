import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import {
  Key, Plus, Trash2, Eye, EyeOff, ArrowLeft, Loader2,
  ShieldCheck, Copy, Check, Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-base";

async function fetchSecrets() {
  const r = await api(`/api/secrets`, { credentials: "include" });
  if (!r.ok) throw new Error("Failed to fetch secrets");
  return r.json();
}

export function SecretsPage() {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: secrets = [], isLoading } = useQuery({
    queryKey: ["secrets"],
    queryFn: fetchSecrets,
  });

  const addMutation = useMutation({
    mutationFn: async ({ name, value }: { name: string; value: string }) => {
      const r = await api(`/api/secrets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, value }),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["secrets"] });
      setShowAdd(false);
      setName("");
      setValue("");
      toast({ title: "Secret saved", description: "Your secret has been encrypted and stored." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await api(`/api/secrets/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["secrets"] });
      toast({ title: "Secret deleted" });
    },
  });

  const handleCopy = (name: string, id: number) => {
    navigator.clipboard.writeText(`process.env.${name}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileTopBar onMenuOpen={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">

            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation("/")}
                className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Secrets</h1>
                <p className="text-sm text-muted-foreground mt-0.5">API keys and tokens your apps can use at runtime</p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300 space-y-1">
                <p className="font-medium text-blue-200">How secrets work</p>
                <p>Values are AES-256 encrypted at rest. In generated code, reference them as <code className="bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-100 font-mono text-xs">process.env.YOUR_KEY_NAME</code> — the platform injects them automatically when your app runs.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Stored secrets ({secrets.length})</span>
                </div>
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add secret
                </button>
              </div>

              {showAdd && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">New secret</p>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Name (e.g. STRIPE_SECRET_KEY)"
                      value={name}
                      onChange={(e) => setName(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                      className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="relative">
                      <input
                        type={showValue ? "text" : "password"}
                        placeholder="Value"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowValue(!showValue)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => addMutation.mutate({ name, value })}
                      disabled={!name || !value || addMutation.isPending}
                      className="flex items-center gap-1.5 text-sm bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-4 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      {addMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Save
                    </button>
                    <button
                      onClick={() => { setShowAdd(false); setName(""); setValue(""); }}
                      className="text-sm px-4 py-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : secrets.length === 0 && !showAdd ? (
                <div className="rounded-xl border border-dashed border-border bg-card/50 py-12 flex flex-col items-center gap-3 text-center">
                  <Key className="w-8 h-8 text-muted-foreground/50" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">No secrets yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Add API keys for Stripe, OpenAI, Twilio, and more</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                  {secrets.map((s: { id: number; name: string; maskedValue: string; updatedAt: string }) => (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
                      <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-medium text-foreground">{s.name}</p>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">{s.maskedValue}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(s.name, s.id)}
                        className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy reference"
                      >
                        {copied === s.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(s.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete secret"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Common secrets</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Stripe Secret Key", key: "STRIPE_SECRET_KEY" },
                  { label: "Stripe Publishable Key", key: "STRIPE_PUBLISHABLE_KEY" },
                  { label: "OpenAI API Key", key: "OPENAI_API_KEY" },
                  { label: "Twilio Auth Token", key: "TWILIO_AUTH_TOKEN" },
                  { label: "SendGrid API Key", key: "SENDGRID_API_KEY" },
                  { label: "Google Client Secret", key: "GOOGLE_CLIENT_SECRET" },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => { setName(s.key); setShowAdd(true); }}
                    className="text-left px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <p className="text-xs font-medium text-foreground">{s.label}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5 truncate">{s.key}</p>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
