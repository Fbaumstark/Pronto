import { useAuth } from "@workspace/replit-auth-web";
import { Code2, Sparkles, Zap, Eye } from "lucide-react";

export function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30">
            <Code2 className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">AI Builder</h1>
            <p className="text-muted-foreground mt-2 text-lg">Build software at the speed of thought.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full">
          {[
            { icon: Sparkles, label: "Describe", desc: "Tell the AI what to build" },
            { icon: Zap, label: "Generate", desc: "Code written in real time" },
            { icon: Eye, label: "Preview", desc: "See it live instantly" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-card border border-border/50 rounded-xl p-4 flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">{label}</span>
              <span className="text-xs text-muted-foreground leading-tight">{desc}</span>
            </div>
          ))}
        </div>

        <div className="w-full bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-5 shadow-xl">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Get started</h2>
            <p className="text-sm text-muted-foreground mt-1">Log in to create and manage your AI-powered apps.</p>
          </div>
          <button
            onClick={login}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-100 shadow-lg shadow-primary/25 text-base"
          >
            Log in to continue
          </button>
          <p className="text-xs text-muted-foreground">
            Your projects, chat history, and files are saved to your account.
          </p>
        </div>
      </div>
    </div>
  );
}
