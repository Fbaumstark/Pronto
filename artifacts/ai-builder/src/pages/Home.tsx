import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { ProntoLogoMark } from "@/components/ProntoLogo";
import {
  Plus, MessageSquare, Code2, Eye, Rocket, Globe, RotateCcw,
  Copy, Check, ChevronRight, Zap, Link2, CreditCard
} from "lucide-react";

const CODE_LINES = [
  { indent: 0, text: "<!DOCTYPE html>", color: "text-blue-400" },
  { indent: 0, text: '<html lang="en">', color: "text-blue-400" },
  { indent: 1, text: "<head>", color: "text-blue-400" },
  { indent: 2, text: '<meta charset="UTF-8" />', color: "text-slate-400" },
  { indent: 2, text: "<title>My App</title>", color: "text-slate-400" },
  { indent: 2, text: "<style>", color: "text-blue-400" },
  { indent: 3, text: "body { margin: 0; font-family: sans-serif; }", color: "text-green-400" },
  { indent: 3, text: ".hero { background: linear-gradient(135deg,", color: "text-green-400" },
  { indent: 4, text: "  #667eea 0%, #764ba2 100%); }", color: "text-purple-400" },
  { indent: 2, text: "</style>", color: "text-blue-400" },
  { indent: 1, text: "</head>", color: "text-blue-400" },
  { indent: 1, text: "<body>", color: "text-blue-400" },
  { indent: 2, text: '<div class="hero">', color: "text-yellow-400" },
  { indent: 3, text: "<h1>Welcome!</h1>", color: "text-orange-400" },
  { indent: 2, text: "</div>", color: "text-yellow-400" },
  { indent: 1, text: "</body>", color: "text-blue-400" },
  { indent: 0, text: "</html>", color: "text-blue-400" },
];

function AnimatedCodeWindow() {
  const [visibleLines, setVisibleLines] = useState(0);
  useEffect(() => {
    if (visibleLines >= CODE_LINES.length) {
      const reset = setTimeout(() => setVisibleLines(0), 2000);
      return () => clearTimeout(reset);
    }
    const t = setTimeout(() => setVisibleLines((v) => v + 1), 140);
    return () => clearTimeout(t);
  }, [visibleLines]);

  return (
    <div className="rounded-xl overflow-hidden shadow-xl border border-white/10 bg-[#0d1117]">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border-b border-white/10">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        <span className="ml-2 text-xs text-slate-500 font-mono">index.html</span>
        <span className="ml-auto text-[10px] text-emerald-400 animate-pulse">● generating</span>
      </div>
      <div className="p-4 font-mono text-xs leading-5 min-h-[160px]">
        {CODE_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="flex">
            <span className="w-5 text-slate-600 shrink-0 select-none text-[10px]">{i + 1}</span>
            <span style={{ paddingLeft: `${line.indent * 10}px` }} className={line.color}>{line.text}</span>
          </div>
        ))}
        {visibleLines < CODE_LINES.length && (
          <div className="flex">
            <span className="w-5 text-slate-600 shrink-0 text-[10px]">{visibleLines + 1}</span>
            <span className="inline-block w-2 h-3.5 bg-primary animate-pulse rounded-sm ml-0" />
          </div>
        )}
      </div>
    </div>
  );
}

function StepCard({
  number, color, title, children,
}: {
  number: string; color: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className="relative bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${color}`}>
          {number}
        </span>
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground">
      <span className="flex-1 truncate">{url}</span>
      <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors">
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

export function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-background">
      <MobileTopBar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobileDrawer />
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="relative min-h-full">
          {/* Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px]" />
            <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-accent/6 rounded-full blur-[140px]" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-5 py-10 md:py-16 space-y-12">

            {/* ── WELCOME HERO ── */}
            <section className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-6 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl rounded-full" />
                  <ProntoLogoMark size={64} className="relative" />
                </div>
              </div>
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                AI-Powered App Builder
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight leading-[1.05]">
                <span className="text-foreground">Build apps with</span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-400 to-accent">just words.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                You're in. Here's how to go from idea to live app in minutes — no coding needed.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/40 border border-border/50 rounded-full px-5 py-2.5 w-fit mx-auto">
                <Plus className="w-4 h-4 text-primary" />
                Click <strong className="text-foreground mx-1">+&nbsp;New Project</strong> in the sidebar to get started
              </div>
            </section>

            {/* ── GETTING STARTED GUIDE ── */}
            <section className="space-y-4">
              <div className="text-center">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Getting started</span>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2">From idea to live app in 4 steps</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Step 1 */}
                <StepCard number="1" color="bg-primary/20 border border-primary/30 text-primary" title="Create a new project">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Click <strong className="text-foreground">+</strong> in the left sidebar or pick one of the ready-made templates —
                    a landing page, to-do app, portfolio, and more. Templates give you a head start.
                  </p>
                  <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground border border-border/40">
                    <Plus className="w-4 h-4 text-primary shrink-0" />
                    <span>Sidebar → <strong className="text-foreground">New Project</strong> or choose a template</span>
                  </div>
                </StepCard>

                {/* Step 2 */}
                <StepCard number="2" color="bg-violet-500/20 border border-violet-500/30 text-violet-400" title="Describe your app in chat">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Type what you want to build in plain English. Be as specific or as vague as you like —
                    the AI will ask follow-up questions and start writing code in real time.
                  </p>
                  <AnimatedCodeWindow />
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {[
                      "\"Build a landing page for my bakery with a menu and contact form\"",
                      "\"Make a quiz app with 5 questions and a score at the end\"",
                      "\"Create a personal portfolio with a dark theme\"",
                    ].map((ex) => (
                      <div key={ex} className="flex items-start gap-2 bg-muted/20 rounded-lg px-3 py-2 border border-border/30">
                        <MessageSquare className="w-3 h-3 text-violet-400 shrink-0 mt-0.5" />
                        <span className="italic">{ex}</span>
                      </div>
                    ))}
                  </div>
                </StepCard>

                {/* Step 3 */}
                <StepCard number="3" color="bg-green-500/20 border border-green-500/30 text-green-400" title="Deploy to get a public URL">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    When you're happy with the preview, click <strong className="text-foreground">Deploy</strong> in the right-hand panel.
                    Your app goes live instantly and gets a unique Pronto URL — shareable with anyone, no sign-in needed.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5 border border-border/40">
                      <Rocket className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-xs text-foreground font-medium">Click Deploy → your app is live in seconds</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Your app URL looks like:</p>
                      <CopyableUrl url="https://yoursite.com/api/p/pronto-ab12cd34" />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                      <Check className="w-3 h-3 shrink-0" />
                      Anyone with the link can open your app — no account needed
                    </div>
                  </div>
                </StepCard>

                {/* Step 4 */}
                <StepCard number="4" color="bg-blue-500/20 border border-blue-500/30 text-blue-400" title="Use your own domain (optional)">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Want <code className="text-primary text-[11px] bg-primary/10 px-1 rounded">myapp.com</code> instead of the Pronto URL?
                    Add your custom domain in the Deploy panel and point your DNS CNAME to this server.
                  </p>
                  <div className="space-y-2">
                    <div className="bg-muted/30 rounded-xl p-3 border border-border/40 space-y-2">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">How to connect your domain</p>
                      {[
                        { icon: "1️⃣", text: "In the Deploy panel, click \"Add custom domain\"" },
                        { icon: "2️⃣", text: "Enter your domain, e.g. myapp.com" },
                        { icon: "3️⃣", text: "In your domain registrar (GoDaddy, Namecheap, etc.), add a CNAME record pointing to this server's hostname" },
                        { icon: "4️⃣", text: "DNS updates in minutes — your custom URL goes live" },
                      ].map(({ icon, text }) => (
                        <div key={text} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="shrink-0">{icon}</span>
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-muted/20 rounded-lg p-2 border border-border/30 text-center">
                        <p className="text-muted-foreground">Pronto URL (free)</p>
                        <p className="text-foreground font-medium mt-0.5">yoursite.com/api/p/pronto-xxx</p>
                      </div>
                      <div className="bg-blue-500/10 rounded-lg p-2 border border-blue-500/20 text-center">
                        <p className="text-blue-400">Your own domain</p>
                        <p className="text-foreground font-medium mt-0.5">mybrilliantapp.com</p>
                      </div>
                    </div>
                  </div>
                </StepCard>

              </div>
            </section>

            {/* ── CREDITS EXPLAINER ── */}
            <section className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Your credits</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every AI generation uses <strong className="text-foreground">~5,000 credits</strong>. You received <strong className="text-foreground">50,000 free credits</strong> when you signed up — enough for about 10 full app generations. Your balance is always shown in the sidebar.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Free on signup", value: "50,000", sub: "≈ 10 generations", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
                  { label: "Starter pack", value: "$9", sub: "500,000 credits · ≈ 100 generations", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
                  { label: "Pro pack", value: "$19", sub: "2,000,000 credits · ≈ 400 generations", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
                ].map(({ label, value, sub, color, bg }) => (
                  <div key={label} className={`rounded-xl p-3 border ${bg} text-center`}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-border/40">
                <CreditCard className="w-3.5 h-3.5 shrink-0 text-primary" />
                To buy more credits, click <strong className="text-foreground mx-1">Buy Credits</strong> in the sidebar. Secure checkout via Stripe — one-time charge, no subscription.
              </div>
            </section>

            {/* ── TIPS ── */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Tips for great results</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { emoji: "🎯", title: "Be specific", desc: "\"A landing page for a yoga studio with a booking button and green color scheme\" works better than \"a website\"." },
                  { emoji: "🔁", title: "Iterate freely", desc: "After the first generation, keep chatting — \"make the header bigger\", \"add a footer\", \"change to dark mode\"." },
                  { emoji: "🕹️", title: "Use version history", desc: "Every AI generation is auto-saved. If you don't like a change, roll back to any previous version instantly." },
                  { emoji: "🧩", title: "Start from a template", desc: "Templates give the AI a solid foundation. It's faster than starting from scratch and the results are polished." },
                ].map(({ emoji, title, desc }) => (
                  <div key={title} className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-colors">
                    <div className="text-xl mb-2">{emoji}</div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── CTA ── */}
            <section className="relative rounded-3xl overflow-hidden border border-border/50 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
              <div className="relative px-8 py-12 space-y-4">
                <div className="text-5xl">🚀</div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">Ready to build?</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Click <strong className="text-foreground">+</strong> in the sidebar to start your first project. It takes 30 seconds.
                </p>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {["Portfolio site", "Landing page", "To-do app", "Calculator", "Quiz game", "Restaurant menu"].map((idea) => (
                    <span key={idea} className="text-xs bg-card border border-border/60 rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors cursor-default">
                      {idea}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <div className="h-8" />
          </div>
        </div>
      </main>
    </div>
  );
}
