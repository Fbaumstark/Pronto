import { useState, useEffect } from "react";
import { X, Settings, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Zap, Key } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SettingsData {
  provider: "replit" | "own";
  hasOwnApiKey: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [provider, setProvider] = useState<"replit" | "own">("replit");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data: SettingsData) => {
          setSettings(data);
          setProvider(data.provider);
          setApiKey("");
          setSaveStatus("idle");
        })
        .catch(() => setErrorMsg("Failed to load settings"))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMsg("");

    try {
      const body: { provider: string; ownApiKey?: string } = { provider };
      if (provider === "own" && apiKey.trim()) {
        body.ownApiKey = apiKey.trim();
      } else if (provider === "own" && !apiKey.trim() && !settings?.hasOwnApiKey) {
        setErrorMsg("Please enter your Anthropic API key.");
        setIsSaving(false);
        return;
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save");
      const updated: SettingsData = await res.json();
      setSettings(updated);
      setApiKey("");
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setErrorMsg("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearKey = async () => {
    if (!confirm("Remove your Anthropic API key and switch back to Replit AI?")) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "replit", ownApiKey: "" }),
      });
      if (!res.ok) throw new Error();
      const updated: SettingsData = await res.json();
      setSettings(updated);
      setProvider("replit");
      setApiKey("");
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setErrorMsg("Failed to remove key.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl pointer-events-auto overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">AI Provider Settings</h2>
                    <p className="text-xs text-muted-foreground">Choose where AI requests are sent</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Provider</p>

                      <button
                        onClick={() => setProvider("replit")}
                        className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                          provider === "replit"
                            ? "border-primary bg-primary/5"
                            : "border-border bg-muted/30 hover:border-border/80"
                        }`}
                      >
                        <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${provider === "replit" ? "bg-primary/20" : "bg-muted"}`}>
                          <Zap className={`w-4 h-4 ${provider === "replit" ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">Replit AI Integration</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">Recommended</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Uses Replit's managed Anthropic account. No API key needed. Billed against your Replit credits.
                          </p>
                        </div>
                        {provider === "replit" && (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        )}
                      </button>

                      <button
                        onClick={() => setProvider("own")}
                        className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                          provider === "own"
                            ? "border-primary bg-primary/5"
                            : "border-border bg-muted/30 hover:border-border/80"
                        }`}
                      >
                        <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${provider === "own" ? "bg-primary/20" : "bg-muted"}`}>
                          <Key className={`w-4 h-4 ${provider === "own" ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm text-foreground">Your Anthropic API Key</span>
                          <p className="text-xs text-muted-foreground mt-1">
                            Use your own Anthropic account. Billed directly by Anthropic at $3/$15 per million tokens.
                            {settings?.hasOwnApiKey && provider !== "own" && (
                              <span className="block text-amber-400 mt-1">Key saved — switch to activate.</span>
                            )}
                          </p>
                        </div>
                        {provider === "own" && (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        )}
                      </button>
                    </div>

                    <AnimatePresence>
                      {provider === "own" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground">
                              Anthropic API Key
                            </label>
                            {settings?.hasOwnApiKey && (
                              <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>A key is saved. Enter a new one to replace it, or leave blank to keep current.</span>
                              </div>
                            )}
                            <div className="relative">
                              <input
                                type={showKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={settings?.hasOwnApiKey ? "Enter new key to replace..." : "sk-ant-..."}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Get your key at{" "}
                              <a
                                href="https://console.anthropic.com/settings/keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                console.anthropic.com
                              </a>
                            </p>
                            {settings?.hasOwnApiKey && (
                              <button
                                onClick={handleClearKey}
                                className="text-xs text-destructive hover:underline"
                              >
                                Remove saved key and revert to Replit AI
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {errorMsg && (
                      <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {errorMsg}
                      </div>
                    )}

                    {saveStatus === "success" && (
                      <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        Settings saved successfully.
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-muted hover:bg-muted-foreground/20 text-foreground text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
