import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { useListProjects, useCreateProject } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Plus, Rocket, ExternalLink, Copy, Check,
  Loader2, Clock, FolderGit2, Zap, ArrowUpRight, ChevronRight,
  Globe, X, Link2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TemplatePicker } from "@/components/templates/TemplatePicker";

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

function CopySnippet({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-2 w-full text-left bg-background/80 border border-border/60 rounded-lg px-3 py-2 font-mono text-xs text-foreground hover:border-primary/40 transition-colors group"
    >
      <span className="flex-1 truncate">{text}</span>
      {copied ? <Check className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-foreground" />}
    </button>
  );
}

function CustomDomainModal({
  projectId,
  deployment,
  onClose,
  onSaved,
}: {
  projectId: number;
  deployment: Deployment;
  onClose: () => void;
  onSaved: (domain: string) => void;
}) {
  const [domain, setDomain] = useState(deployment.customDomain ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(true);

  const cnameTarget = window.location.host;
  const appUrl = `${window.location.origin}/api/p/${deployment.slug}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!cleaned) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/deployment/domain`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDomain: cleaned }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save");
      setSaved(true);
      onSaved(cleaned);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      n: 1,
      title: "Log in to Cloudflare and select your domain",
      detail: 'Go to cloudflare.com → Dashboard → click your domain → open the "DNS" tab.',
    },
    {
      n: 2,
      title: 'Click "Add record" and fill in these values',
      detail: null,
      record: { type: "CNAME", name: "www  (or @ for root)", target: cnameTarget, proxy: "Proxied (orange cloud) ✓" },
    },
    {
      n: 3,
      title: 'Set SSL mode to "Flexible"',
      detail: 'In Cloudflare, go to SSL/TLS → Overview → choose "Flexible". This is required because Replit\'s servers present a certificate for their own domain — "Full" or "Full (strict)" will cause an SSL error on your custom domain.',
    },
    {
      n: 4,
      title: "Enter your domain above and save",
      detail: "Type your domain (e.g. www.example.com) in the field above. Our server needs to know which project to serve when your domain is visited.",
    },
    {
      n: 5,
      title: "Wait ~5 minutes for DNS to propagate",
      detail: "Cloudflare is usually instant, but global DNS can take a few minutes. Then visit your domain and you should see your app.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Connect a custom domain</h2>
              <p className="text-xs text-muted-foreground">Works with any registrar — Cloudflare guide below</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Domain input */}
          <form onSubmit={handleSave} className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Your custom domain</label>
            <div className="flex gap-2">
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="www.yourdomain.com"
                className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="submit"
                disabled={saving || !domain.trim()}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : "Save"}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
              </div>
            )}
            {saved && (
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Domain saved — visit it after DNS propagates.
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Current Pronto URL: <a href={appUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{appUrl}</a>
            </p>
          </form>

          {/* Cloudflare guide */}
          <div className="border border-border/60 rounded-xl overflow-hidden">
            <button
              onClick={() => setGuideOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Cloudflare setup guide</span>
                <span className="text-[10px] bg-orange-500/15 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded font-medium">Free</span>
              </div>
              {guideOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {guideOpen && (
              <div className="px-4 pb-4 pt-3 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Cloudflare is free and handles your SSL automatically. Keep the proxy <span className="font-semibold text-foreground">enabled (orange cloud)</span> — that's what gives you HTTPS. Set SSL mode to <span className="font-semibold text-foreground">Flexible</span> so Cloudflare can reach Replit's servers without a cert mismatch.
                </p>

                {steps.map((step) => (
                  <div key={step.n} className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-primary">{step.n}</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-semibold text-foreground">{step.title}</p>
                      {step.detail && <p className="text-xs text-muted-foreground">{step.detail}</p>}
                      {step.record && (
                        <div className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-1.5 text-xs">
                          {Object.entries(step.record).map(([k, v]) => (
                            <div key={k} className="flex items-start gap-2">
                              <span className="text-muted-foreground w-16 shrink-0 capitalize">{k}:</span>
                              {k === "target" ? (
                                <CopySnippet text={v} />
                              ) : (
                                <span className="font-mono text-foreground font-medium">{v}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <Link2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-300">
                    <span className="font-semibold">Tip:</span> If using a root domain (@), some registrars don't support CNAME at root — use <span className="font-mono">www</span> instead and set up a redirect from the root to www in Cloudflare's Page Rules.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: any }) {
  const [, setLocation] = useLocation();
  const { deployment, refetch } = useProjectDeployment(project.id);
  const [deploying, setDeploying] = useState(false);
  const [showDomain, setShowDomain] = useState(false);

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
    <>
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
                onClick={(e) => { e.stopPropagation(); setShowDomain(true); }}
                title="Connect custom domain"
                className="shrink-0 p-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
              </button>
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

        {/* Custom domain chip — shown if one is set */}
        {deployment?.isLive && deployment.customDomain && (
          <div
            onClick={(e) => { e.stopPropagation(); setShowDomain(true); }}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Globe className="w-3 h-3 shrink-0" />
            <span className="truncate">{deployment.customDomain}</span>
          </div>
        )}
      </div>

      {showDomain && deployment?.isLive && (
        <CustomDomainModal
          projectId={project.id}
          deployment={deployment}
          onClose={() => setShowDomain(false)}
          onSaved={async () => { await refetch(); }}
        />
      )}
    </>
  );
}

interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  emoji: string;
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const createMutation = useCreateProject();

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const proj = await createMutation.mutateAsync({
      data: { name, description: desc, templateId: selectedTemplateId } as any,
    });
    onCreated(proj.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">New project</h2>
            <p className="text-sm text-muted-foreground">Pick a template or start from scratch.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {templates.length > 0 && (
            <TemplatePicker
              templates={templates}
              selectedId={selectedTemplateId}
              onSelect={setSelectedTemplateId}
            />
          )}

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
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              ) : (
                selectedTemplateId ? "Create from template" : "Create project"
              )}
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
  const { user } = useAuth() as any;
  const isAdmin = user?.email === "frank@tray-iq.com";
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span>Each AI generation uses ~5,000 credits. Subscribe for $10/month (500k credits) — auto top-up at $25 if balance hits zero.</span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setLocation("/admin")}
                  className="text-[10px] text-muted-foreground opacity-30 hover:opacity-70 transition-opacity shrink-0"
                >
                  admin
                </button>
              )}
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
