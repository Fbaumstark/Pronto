import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { ProntoLogoMark } from "@/components/ProntoLogo";
import { Plus } from "lucide-react";

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
    <div className="relative rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-[#0d1117]">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-white/10">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
        <span className="ml-2 text-xs text-slate-500 font-mono">index.html</span>
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[10px] text-emerald-400 animate-pulse">● generating</span>
        </div>
      </div>
      <div className="p-4 font-mono text-xs leading-5 min-h-[220px]">
        {CODE_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="flex">
            <span className="w-6 text-slate-600 shrink-0 select-none">{i + 1}</span>
            <span style={{ paddingLeft: `${line.indent * 12}px` }} className={line.color}>
              {line.text}
            </span>
          </div>
        ))}
        {visibleLines < CODE_LINES.length && (
          <div className="flex">
            <span className="w-6 text-slate-600 shrink-0">{visibleLines + 1}</span>
            <span className="inline-block w-2 h-4 bg-primary animate-pulse rounded-sm" />
          </div>
        )}
      </div>
    </div>
  );
}

function ChatBubble({ message, isAI, delay = 0 }: { message: string; isAI?: boolean; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={`flex gap-2 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"} ${isAI ? "flex-row" : "flex-row-reverse"}`}
    >
      {isAI ? (
        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[8px]">AI</span>
        </div>
      ) : (
        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[8px]">You</span>
        </div>
      )}
      <div
        className={`rounded-xl px-3 py-2 text-xs max-w-[80%] ${
          isAI
            ? "bg-card border border-border/60 text-foreground"
            : "bg-primary/15 border border-primary/20 text-foreground"
        }`}
      >
        {message}
      </div>
    </div>
  );
}

function ChatIllustration() {
  return (
    <div className="relative rounded-xl overflow-hidden border border-border/50 bg-background shadow-xl">
      <div className="flex items-center gap-2 px-4 py-3 bg-card border-b border-border/50">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span className="text-xs font-medium text-foreground">Pronto Chat</span>
      </div>
      <div className="p-4 space-y-3 min-h-[180px]">
        <ChatBubble message="Build me a landing page for a coffee shop" delay={200} />
        <ChatBubble message="Sure! I'll create a warm, inviting landing page with a hero section, menu preview, and contact form." isAI delay={900} />
        <ChatBubble message="Make the hero full-screen with a parallax image" delay={1800} />
        <ChatBubble message="Done! Check the preview →" isAI delay={2500} />
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 bg-muted/50 border border-border/50 rounded-lg px-3 py-2">
          <span className="text-xs text-muted-foreground flex-1">Describe what to change...</span>
          <div className="w-5 h-5 rounded-md bg-primary/80 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewWindow() {
  return (
    <div className="relative rounded-xl overflow-hidden border border-border/50 bg-background shadow-xl">
      <div className="flex items-center gap-2 px-4 py-3 bg-card border-b border-border/50">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-xs font-medium text-foreground">Live Preview</span>
        <div className="ml-auto text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">sandbox</div>
      </div>
      <div className="relative overflow-hidden" style={{ height: "180px" }}>
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900 via-amber-800 to-stone-900" />
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400 to-transparent" />
        <div className="relative p-6 text-center">
          <h2 className="text-white font-bold text-lg leading-tight drop-shadow">Brew & Co.</h2>
          <p className="text-amber-200/80 text-[10px] mt-1">Artisan Coffee · Downtown</p>
          <div className="mt-3 flex justify-center gap-2">
            <div className="bg-amber-500 text-white text-[9px] font-semibold px-3 py-1 rounded-full">Our Menu</div>
            <div className="border border-amber-400/50 text-amber-200 text-[9px] px-3 py-1 rounded-full">Visit Us</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {["☕ Espresso", "🥛 Latte", "🍵 Matcha"].map((item) => (
              <div key={item} className="bg-black/20 backdrop-blur-sm rounded-lg p-2 text-[8px] text-amber-100">{item}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center gap-1 text-muted-foreground/40">
      <div className="w-px h-8 bg-gradient-to-b from-transparent via-primary/40 to-primary/40" />
      <svg className="w-4 h-4 text-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

const FEATURES = [
  {
    emoji: "🗣️",
    title: "Natural Language",
    desc: "Describe your app the way you'd explain it to a friend. No syntax required.",
    gradient: "from-violet-500/10 to-purple-500/5",
    border: "border-violet-500/20",
  },
  {
    emoji: "⚡",
    title: "Real-Time Generation",
    desc: "Watch code appear line by line as the AI builds your app live.",
    gradient: "from-amber-500/10 to-orange-500/5",
    border: "border-amber-500/20",
  },
  {
    emoji: "🔒",
    title: "Sandboxed Preview",
    desc: "Every project runs in an isolated preview — safe, instant, no setup needed.",
    gradient: "from-emerald-500/10 to-green-500/5",
    border: "border-emerald-500/20",
  },
  {
    emoji: "🕹️",
    title: "Version History",
    desc: "Every AI generation is auto-saved. Roll back to any snapshot with one click.",
    gradient: "from-blue-500/10 to-cyan-500/5",
    border: "border-blue-500/20",
  },
  {
    emoji: "🚀",
    title: "Instant Deploy",
    desc: "Publish your project to a public URL in seconds, no DevOps needed.",
    gradient: "from-rose-500/10 to-pink-500/5",
    border: "border-rose-500/20",
  },
  {
    emoji: "🧩",
    title: "Templates",
    desc: "Start from a polished template and let AI customize it for your idea.",
    gradient: "from-sky-500/10 to-indigo-500/5",
    border: "border-sky-500/20",
  },
];

export function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-background">
      <MobileTopBar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobileDrawer />
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="relative min-h-full">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px]" />
            <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-accent/6 rounded-full blur-[140px]" />
            <div className="absolute -bottom-20 left-1/3 w-[400px] h-[400px] bg-purple-500/6 rounded-full blur-[100px]" />
            <div
              className="absolute inset-0 opacity-[0.015]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                backgroundSize: "28px 28px",
              }}
            />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-20 space-y-20 md:space-y-28">

            <section className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="relative inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  AI-Powered App Builder
                </div>
              </div>

              <div className="flex justify-center mb-2">
                <div className="relative">
                  <div className="absolute -inset-6 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl rounded-full" />
                  <ProntoLogoMark size={72} className="relative" />
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.05]">
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-foreground via-foreground to-foreground/50">
                  Build apps with
                </span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-400 to-accent">
                  just words.
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Describe what you want to build. Our AI writes the code, manages files, and shows you a live preview — instantly.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 border border-border/50 rounded-full px-4 py-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Create a new project from the sidebar to start
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="text-center">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">How it works</span>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2">From idea to app in three steps</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 lg:gap-0 items-center">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center">1</span>
                    <h3 className="font-semibold text-foreground">Chat with AI</h3>
                  </div>
                  <ChatIllustration />
                </div>

                <FlowArrow />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-400 text-xs font-bold flex items-center justify-center">2</span>
                    <h3 className="font-semibold text-foreground">Watch code generate</h3>
                  </div>
                  <AnimatedCodeWindow />
                </div>

                <FlowArrow />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold flex items-center justify-center">3</span>
                    <h3 className="font-semibold text-foreground">See it live</h3>
                  </div>
                  <PreviewWindow />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="text-center">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Everything included</span>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2">All the tools you need</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className={`group relative rounded-2xl p-5 bg-gradient-to-br ${f.gradient} border ${f.border} hover:scale-[1.02] transition-all duration-300 overflow-hidden`}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/[0.02]" />
                    <div className="text-3xl mb-3">{f.emoji}</div>
                    <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative rounded-3xl overflow-hidden border border-border/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
              <div className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="relative px-8 py-12 text-center space-y-4">
                <div className="text-5xl">✨</div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">Ready to build something?</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Open a project from the sidebar, or click <strong className="text-foreground">+</strong> to start fresh.
                  Your first 50,000 credits are on us.
                </p>
                <div className="flex flex-wrap gap-3 justify-center pt-2">
                  {["Portfolio site", "To-do app", "Landing page", "Calculator", "Quiz game"].map((idea) => (
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
