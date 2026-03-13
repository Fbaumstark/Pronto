import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Code2, Wand2, Sparkles } from "lucide-react";

export function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-background">
      <MobileTopBar onMenuClick={() => setSidebarOpen(true)} />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobileDrawer
      />

      <Sidebar />

      <main className="flex-1 relative overflow-y-auto flex flex-col items-center justify-center p-6 md:p-8 text-center">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-accent/20 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-2xl w-full space-y-6 md:space-y-8 animate-fade-in">
          <div className="flex justify-center mb-4 md:mb-8">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary to-accent opacity-30 blur-2xl rounded-full animate-pulse" />
              <div className="relative w-16 h-16 md:w-24 md:h-24 bg-card border border-border/50 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl">
                <img
                  src={`${import.meta.env.BASE_URL}images/logo.png`}
                  alt="AI Builder Logo"
                  className="w-10 h-10 md:w-16 md:h-16 object-contain"
                />
              </div>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/60">
            Build software at the speed of thought.
          </h1>

          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Create an entire web application using just natural language. Our AI writes the code, manages the files, and deploys the preview instantly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 pt-6 md:pt-12">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 p-5 md:p-6 rounded-2xl flex flex-col items-center text-center hover:bg-card hover:border-primary/30 transition-all duration-300">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-4 text-primary">
                <Wand2 className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-1 md:mb-2">Describe</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Tell the AI what you want to build in plain English.</p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm border border-border/50 p-5 md:p-6 rounded-2xl flex flex-col items-center text-center hover:bg-card hover:border-primary/30 transition-all duration-300">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-3 md:mb-4 text-accent">
                <Code2 className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-1 md:mb-2">Generate</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Watch as files and code are written in real-time.</p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm border border-border/50 p-5 md:p-6 rounded-2xl flex flex-col items-center text-center hover:bg-card hover:border-primary/30 transition-all duration-300">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-3 md:mb-4 text-green-500">
                <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-1 md:mb-2">Preview</h3>
              <p className="text-xs md:text-sm text-muted-foreground">See the live result instantly in the secure sandbox.</p>
            </div>
          </div>

          <p className="text-xs md:text-sm text-muted-foreground/50 pt-4 md:pt-8">
            Select a project from the sidebar or tap <strong className="text-muted-foreground">+</strong> to create a new one.
          </p>
        </div>
      </main>
    </div>
  );
}
