import { useState } from "react";
import { Code2, Sparkles, Zap, Eye, Loader2, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

type Mode = "login" | "register";

export function LoginPage() {
  const { setUser } = useAuth() as any;
  const [mode, setMode] = useState<Mode>("login");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { email, password };
      if (mode === "register" && firstName.trim()) body.firstName = firstName.trim();

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      setUser?.(data.user);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30">
            <Code2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">AI Builder</h1>
            <p className="text-muted-foreground mt-1">Build software at the speed of thought.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full">
          {[
            { icon: Sparkles, label: "Describe", desc: "Tell the AI what to build" },
            { icon: Zap, label: "Generate", desc: "Code written in real time" },
            { icon: Eye, label: "Preview", desc: "See it live instantly" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-card border border-border/50 rounded-xl p-3 flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-semibold text-foreground">{label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{desc}</span>
            </div>
          ))}
        </div>

        <div className="w-full bg-card border border-border rounded-2xl p-6 flex flex-col gap-5 shadow-xl">
          <div className="flex rounded-xl bg-muted p-1 gap-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "register" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "register" && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="First name (optional)"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "register" ? 8 : undefined}
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {mode === "register" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-left">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-100 shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {mode === "login" ? "Signing in…" : "Creating account…"}</>
              ) : (
                mode === "login" ? "Sign in" : "Create account"
              )}
            </button>
          </form>

          {mode === "register" && (
            <p className="text-xs text-muted-foreground">
              Password must be at least 8 characters.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
