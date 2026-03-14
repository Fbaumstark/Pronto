import { useState, useRef } from "react";
import {
  Loader2, Mail, Lock, User, Check, Zap, ChevronDown,
  Rocket, History, Globe, Code2, MessageSquare, CreditCard,
  ArrowRight, Star
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { ProntoLogoMark } from "@/components/ProntoLogo";

type Mode = "login" | "register";

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "to start",
    credits: "50,000",
    requests: "~10",
    badge: null,
    color: "border-border",
    headerBg: "bg-muted/30",
    cta: "Start for free",
    ctaStyle: "bg-muted hover:bg-muted/80 text-foreground",
    noCard: true,
    features: [
      "50,000 AI credits on signup",
      "Unlimited projects",
      "Live preview sandbox",
      "6 starter templates",
      "Version history",
      "One-click deployment",
    ],
  },
  {
    name: "Monthly Plan",
    price: "$25",
    period: "/ month",
    credits: "1,250,000",
    requests: "~250",
    badge: "Most popular",
    color: "border-primary",
    headerBg: "bg-primary/10",
    cta: "Start Monthly Plan",
    ctaStyle: "bg-primary hover:bg-primary/90 text-primary-foreground",
    noCard: false,
    features: [
      "1,250,000 AI credits / month",
      "Auto-renews every month",
      "Card billed automatically",
      "Everything in Free",
      "Priority support",
    ],
  },
  {
    name: "Auto Top-up",
    price: "$25",
    period: "per refill",
    credits: "1,250,000",
    requests: "~250",
    badge: "Pay as you go",
    color: "border-violet-500/50",
    headerBg: "bg-violet-500/10",
    cta: "Included with Monthly",
    ctaStyle: "bg-violet-600/50 cursor-default text-white",
    noCard: false,
    features: [
      "1,250,000 credits per top-up",
      "Triggers automatically at $0",
      "Billed in $25 increments",
      "Charged to card on file",
      "Never interrupted mid-project",
    ],
  },
];

function AuthForm({ defaultMode, onSuccess }: { defaultMode: Mode; onSuccess: (user: any) => void }) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const switchMode = (m: Mode) => { setMode(m); setError(null); setPassword(""); setConfirmPassword(""); setAgreedToTerms(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "register" && password !== confirmPassword) { setError("Passwords don't match"); return; }
    if (mode === "register" && !agreedToTerms) { setError("You must agree to the Terms of Service and Privacy Policy to create an account."); return; }
    setIsLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { email, password };
      if (mode === "register" && firstName.trim()) body.firstName = firstName.trim();
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      onSuccess(data.user);
    } catch { setError("Network error. Please try again."); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="w-full bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
      <div className="flex rounded-xl bg-muted p-1 gap-1">
        {(["login", "register"] as Mode[]).map((m) => (
          <button key={m} type="button" onClick={() => switchMode(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {m === "login" ? "Sign in" : "Create free account"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "register" && (
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="First name (optional)" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        )}
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
            autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 8 : undefined}
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        {mode === "register" && (
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password"
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        )}
        {mode === "register" && (
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 rounded border-border accent-primary cursor-pointer"
            />
            <span className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
              I agree to Pronto's{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
                Terms of Service
              </a>{" "}and{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
                Privacy Policy
              </a>. I confirm I am at least 13 years old and understand the Service is provided as-is with no guarantees of uptime or data retention.
            </span>
          </label>
        )}
        {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={isLoading || (mode === "register" && !agreedToTerms)}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25">
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> {mode === "login" ? "Signing in…" : "Creating account…"}</>
            : mode === "login" ? "Sign in" : "Create free account — no card needed"}
        </button>
      </form>

      {mode === "register" && (
        <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
          <Check className="w-3.5 h-3.5 text-green-400" />
          <span>50,000 free credits included on signup</span>
        </div>
      )}
    </div>
  );
}

export function LoginPage() {
  const { setUser } = useAuth() as any;
  const signupRef = useRef<HTMLDivElement>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [adminRedirect, setAdminRedirect] = useState(false);

  const scrollToSignup = () => {
    signupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSuccess = (user: any) => {
    setUser?.(user);
    if (adminRedirect) {
      window.location.href = "/admin";
    }
  };

  const openAdminLogin = () => {
    setAdminRedirect(true);
    setShowSignInModal(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-accent/6 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
      </div>

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ProntoLogoMark size={36} />
            <span className="font-display font-bold text-lg text-foreground">Pronto</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setShowSignInModal(true); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
              Sign in
            </button>
            <button onClick={scrollToSignup}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5">
              Get started free <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 md:pt-24 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              50,000 free credits. No card required.
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight leading-[1.05]">
              <span className="text-foreground">Build apps with</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-400 to-accent">just words.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              Describe what you want in plain English. Pronto's AI writes every line of code, shows you a live preview, and deploys it — all in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={scrollToSignup}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl text-base transition-all shadow-lg shadow-primary/25 hover:scale-[1.02]">
                Start building free <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-3 bg-muted/30 rounded-xl border border-border/50">
                <Check className="w-4 h-4 text-green-400 shrink-0" />
                50,000 credits free — no card required
              </div>
            </div>
            <div className="flex items-center gap-6 pt-2">
              {[["⚡", "Real-time generation"], ["🔒", "Secure sandbox"], ["🚀", "Instant deploy"]].map(([emoji, label]) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{emoji}</span><span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero form */}
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground font-medium">Create your free account</p>
            <AuthForm defaultMode="register" onSuccess={handleSuccess} />
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { icon: MessageSquare, label: "Describe it" },
                { icon: Code2, label: "AI builds it" },
                { icon: Globe, label: "Deploy it" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="bg-muted/30 border border-border/40 rounded-xl p-3 flex flex-col items-center gap-1.5 text-center">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT SCREENSHOT ── */}
      <section className="border-t border-border/50 py-16 md:py-24 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">See it in action</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Your AI co-developer, always on</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Chat on the left, live code in the center, instant preview on the right — everything synced in real time.</p>
          </div>
          {/* Browser chrome frame */}
          <div className="relative mx-auto max-w-4xl">
            {/* Glow behind */}
            <div className="absolute inset-0 -m-4 bg-primary/10 rounded-3xl blur-2xl pointer-events-none" />
            <div className="relative bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#141424] border-b border-white/8">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-green-500/70" />
                <div className="flex-1 mx-4 bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[11px] text-white/30 font-mono">
                  pronto-app.replit.app
                </div>
              </div>
              <img
                src="/landing/hero-screenshot.png"
                alt="Pronto builder interface showing AI chat, code editor and live preview"
                className="w-full h-auto block"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-t border-border/50 py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">From idea to live app in minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: "1", img: "/landing/step-describe.png", title: "Describe your app", body: "Type what you want in plain English — 'a to-do list with drag and drop' or 'a landing page for my coffee shop'. No technical knowledge needed." },
              { n: "2", img: "/landing/step-build.png", title: "Watch AI build it", body: "Pronto streams code in real time as the AI writes every file. You see the live preview update instantly as the app takes shape." },
              { n: "3", img: "/landing/step-deploy.png", title: "Publish with one click", body: "Hit Deploy and your app gets a public URL — shareable with anyone. Add your own domain. No servers to manage, ever." },
            ].map(({ n, img, title, body }) => (
              <div key={n} className="relative group">
                <div className="bg-card border border-border/60 rounded-2xl overflow-hidden h-full hover:border-primary/30 transition-colors">
                  <div className="relative bg-muted/30 overflow-hidden">
                    <img
                      src={img}
                      alt={title}
                      className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg">
                      {n}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Simple, usage-based billing.</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              $25/month minimum keeps your account active. When credits run out, we automatically
              top up in $25 increments — so you're never interrupted mid-build.
            </p>
          </div>

          {/* Competitor callout */}
          <div className="flex items-center justify-center gap-3 mb-10 mt-6">
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 text-sm text-green-400 font-medium">
              <Check className="w-4 h-4" />
              10x less expensive than Replit Agent ($25/mo subscription)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING.map((plan) => (
              <div key={plan.name} className={`relative bg-card rounded-2xl border-2 ${plan.color} overflow-hidden flex flex-col`}>
                {plan.badge && (
                  <div className="absolute top-3 right-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-2.5 h-2.5" /> {plan.badge}
                    </span>
                  </div>
                )}
                <div className={`${plan.headerBg} px-6 py-5 border-b border-border/50`}>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">{plan.name}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{plan.credits} AI credits</p>
                    <p className="text-xs text-muted-foreground">{plan.requests} app generations</p>
                  </div>
                </div>
                <div className="px-6 py-5 flex-1">
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-6 pb-5">
                  <button onClick={scrollToSignup}
                    className={`w-full ${plan.ctaStyle} font-semibold py-2.5 rounded-xl text-sm transition-colors`}>
                    {plan.cta}
                  </button>
                  {plan.noCard && (
                    <p className="text-center text-[11px] text-muted-foreground mt-2">No credit card required</p>
                  )}
                  {!plan.noCard && (
                    <p className="text-center text-[11px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
                      <CreditCard className="w-3 h-3" /> Secure checkout via Stripe
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* How billing works */}
          <div className="mt-10 bg-muted/30 border border-border/50 rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> How billing works
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="text-xl shrink-0">1️⃣</span>
                <div><p className="font-medium text-foreground mb-0.5">Sign up free</p><p>Get 50,000 credits instantly. No card required to start.</p></div>
              </div>
              <div className="flex gap-3">
                <span className="text-xl shrink-0">2️⃣</span>
                <div><p className="font-medium text-foreground mb-0.5">Subscribe for $25/mo</p><p>Adds 1,250,000 credits each month. Your card is saved securely for auto-billing.</p></div>
              </div>
              <div className="flex gap-3">
                <span className="text-xl shrink-0">3️⃣</span>
                <div><p className="font-medium text-foreground mb-0.5">Build without limits</p><p>Credits scale with usage — short prompts cost less, big builds cost more (~250 generations/month on base plan).</p></div>
              </div>
              <div className="flex gap-3">
                <span className="text-xl shrink-0">4️⃣</span>
                <div><p className="font-medium text-foreground mb-0.5">Auto top-up at $0</p><p>Credits hit zero? We automatically charge $25 and add 1,250,000 more — no interruption.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="border-t border-border/50 py-16 md:py-24 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Everything you need to ship</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { emoji: "🗣️", title: "Natural Language", desc: "Just describe what you want — no syntax, no frameworks to learn." },
              { emoji: "⚡", title: "Real-Time Streaming", desc: "Watch every line of code appear as the AI writes it." },
              { emoji: "👁️", title: "Live Preview", desc: "See your app running instantly in a secure sandbox." },
              { emoji: "🕹️", title: "Version History", desc: "Every generation auto-saved. Roll back with one click." },
              { emoji: "🚀", title: "Instant Deployment", desc: "Publish to a public URL in seconds. Zero DevOps." },
              { emoji: "🌐", title: "Custom Domains", desc: "Connect your own domain to any deployed project." },
              { emoji: "🧩", title: "Starter Templates", desc: "6 polished templates to kick off your project in style." },
              { emoji: "💳", title: "Pay As You Go", desc: "Buy only what you need. Credits never expire." },
              { emoji: "🔒", title: "Secure by Default", desc: "Apps run in an isolated sandbox. Your code stays private." },
            ].map((f) => (
              <div key={f.title} className="bg-card border border-border/50 rounded-xl p-5 hover:border-primary/30 hover:scale-[1.01] transition-all">
                <div className="text-2xl mb-2">{f.emoji}</div>
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SIGN UP SECTION ── */}
      <section ref={signupRef} className="py-16 md:py-24">
        <div className="max-w-lg mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="text-5xl">✨</div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Start building in 30 seconds</h2>
          <p className="text-muted-foreground">
            Create a free account and get 50,000 AI credits immediately.
            No credit card required to start.
          </p>
          <AuthForm defaultMode="register" onSuccess={handleSuccess} />
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <button onClick={() => setShowSignInModal(true)} className="text-primary hover:underline font-medium">Sign in</button>
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/50 py-8 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ProntoLogoMark size={24} />
            <span className="font-semibold text-foreground">Pronto</span>
            <span>— Build software at the speed of thought.</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5" />
              Payments secured by Stripe
            </div>
            <button onClick={openAdminLogin} className="opacity-30 hover:opacity-60 transition-opacity text-[10px] cursor-pointer">admin</button>
          </div>
        </div>
      </footer>

      {/* ── SIGN IN MODAL ── */}
      {showSignInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowSignInModal(false)}>
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <ProntoLogoMark size={28} />
                <span className="font-bold text-foreground">Sign in to Pronto</span>
              </div>
              <button onClick={() => setShowSignInModal(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <AuthForm defaultMode="login" onSuccess={(user) => { setShowSignInModal(false); handleSuccess(user); }} />
          </div>
        </div>
      )}
    </div>
  );
}
