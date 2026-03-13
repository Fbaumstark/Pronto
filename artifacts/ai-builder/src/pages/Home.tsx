import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { useListProjects, useCreateProject } from "@workspace/api-client-react";
import {
  Plus, Rocket, ExternalLink, Copy, Check,
  Loader2, Clock, FolderGit2, Zap, ArrowUpRight, ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Deployment {
  slug: string;
  customDomain: string | null;
  isLive: boolean;
}

function useProjectDeployment(projectId: number) {
  const [deployment, setDeployment] = useState<Deployment | null | undefined>(undefined);
  const refetch = () => {
    fetch(`/api/projects/${projectId}/deployment`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setDeployment)
      .catch(() => setDeployment(null));
  };
  useEffect(() => { refetch(); }, [projectId]);
  return { deployment, refetch };
}

function LiveUrlBadge({ deployment }: { deployment: Deployment }) {
  const [copied, setCopied] = useState(false);
  const baseUrl = window.location.origin;
  const url = deployment.customDomain
    ? `https://${deployment.customDomain}`
    : `${baseUrl}/api/p/${deployment.slug}`;

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-lg px-2.5 py-1.5 flex-1 min-w-0">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
      <span className="text-xs text-green-400 font-medium truncate flex-1">{url}</span>
      <button
        onClick={copy}
        title="Copy URL"
        className="p-0.5 rounded hover:bg-green-500/20 text-green-400 transition-colors shrink-0"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="p-0.5 rounded hover:bg-green-500/20 text-green-400 transition-colors shrink-0"
        title="Open site"
      >
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

function ProjectCard({ project }: { project: any }) {
  const [, setLocation] = useLocation();
  const { deployment, refetch } = useProjectDeployment(project.id);
  const [deploying, setDeploying] = useState(false);

  const handleDeploy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeploying(true);
    try {
      await fetch(`/api/projects/${project.id}/deploy`, { method: "POST" });
      await refetch();
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div
      onClick={() => setLocation(`/project/${project.id}`)}
      className="group bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <FolderGit2 className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate">{project.name}</h3>
            {project.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Clock className="w-3 h-3 shrink-0" />
        <span>Updated {formatDistanceToNow(new Date(project.updatedAt ?? project.createdAt), { addSuffix: true })}</span>
      </div>

      <div className="flex items-center gap-2 mt-1">
        {deployment === undefined ? (
          <div className="h-7 w-32 bg-muted/40 rounded-lg animate-pulse" />
        ) : deployment?.isLive ? (
          <>
            <LiveUrlBadge deployment={deployment} />
            <button
              onClick={handleDeploy}
              disabled={deploying}
              title="Re-publish"
              className="shrink-0 p-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {deploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            </button>
          </>
        ) : (
          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          >
            {deploying ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Publishing…</>
            ) : (
              <><Rocket className="w-3 h-3" /> Publish</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const createMutation = useCreateProject();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const proj = await createMutation.mutateAsync({ data: { name, description: desc } as any });
    onCreated(proj.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-foreground mb-1">New project</h2>
        <p className="text-sm text-muted-foreground mb-5">Give your app a name, then describe it in the chat.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create project"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [, setLocation] = useLocation();
  const { data: projects, isLoading } = useListProjects();

  const liveCount = 0;

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-background">
      <MobileTopBar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobileDrawer />
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 py-8 md:py-12 space-y-8">

          {/* ── HEADER ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Projects</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isLoading ? "Loading…" : projects?.length === 0
                  ? "No projects yet — create your first one below"
                  : `${projects?.length} project${projects?.length !== 1 ? "s" : ""}${
                      projects?.length ? "" : ""
                    }`}
              </p>
            </div>
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>

          {/* ── PROJECT GRID ── */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border/60 rounded-2xl p-5 h-36 animate-pulse" />
              ))}
            </div>
          ) : projects?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-5">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                <Rocket className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Build your first app</h2>
                <p className="text-muted-foreground mt-2 max-w-xs">
                  Describe any app in plain English — Pronto's AI writes the code and gives you a live preview in seconds.
                </p>
              </div>
              <button
                onClick={() => setShowNewProject(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-primary/20"
              >
                <Plus className="w-4 h-4" />
                Create a project
              </button>
              <div className="flex flex-wrap justify-center gap-2 max-w-sm pt-2">
                {["Landing page", "To-do app", "Portfolio", "Quiz game", "Restaurant menu", "Calculator"].map((idea) => (
                  <button
                    key={idea}
                    onClick={() => setShowNewProject(true)}
                    className="text-xs bg-muted/50 border border-border/60 hover:border-primary/30 hover:text-foreground rounded-full px-3 py-1.5 text-muted-foreground transition-colors"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
              <button
                onClick={() => setShowNewProject(true)}
                className="border-2 border-dashed border-border/60 hover:border-primary/40 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-all min-h-[140px] group"
              >
                <div className="w-9 h-9 rounded-xl bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">New project</span>
              </button>
            </div>
          )}

          {/* ── CREDITS STRIP ── */}
          <div className="border-t border-border/40 pt-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>Each AI generation uses ~5,000 credits. Subscribe for $10/month (500k credits) — auto top-up at $25 if balance hits zero.</span>
            </div>
          </div>

        </div>
      </main>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={(id) => {
            setShowNewProject(false);
            setLocation(`/project/${id}`);
          }}
        />
      )}
    </div>
  );
}
