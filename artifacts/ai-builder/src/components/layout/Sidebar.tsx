import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useListProjects, useCreateProject, useDeleteProject } from "@workspace/api-client-react";
import { Plus, FolderGit2, Trash2, Loader2, X, Settings, LogOut, Coins, ChevronDown, ShoppingCart, Zap } from "lucide-react";
import { ProntoLogoMark } from "@/components/ProntoLogo";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsModal } from "./SettingsModal";
import { useAuth } from "@workspace/replit-auth-web";
import { TemplatePicker } from "@/components/templates/TemplatePicker";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  emoji: string;
}

interface CreditProduct {
  product_id: string;
  product_name: string;
  product_description: string;
  product_metadata: Record<string, string>;
  price_id: string;
  unit_amount: number;
  currency: string;
}

function BuyCreditsModal({ onClose }: { onClose: () => void }) {
  const [products, setProducts] = useState<CreditProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/credits/products")
      .then((r) => r.json())
      .then((d) => { setProducts(d.data ?? []); setLoading(false); })
      .catch(() => { setError("Failed to load credit packs"); setLoading(false); });
  }, []);

  const handleBuy = async (priceId: string) => {
    setPurchasing(priceId);
    setError(null);
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start checkout");
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setPurchasing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80 max-w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Buy Credits</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive text-center py-4">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No credit packs available yet.
          </div>
        )}

        <div className="space-y-3">
          {products.map((p) => {
            const credits = parseInt(p.product_metadata?.credits ?? "0");
            const price = p.unit_amount / 100;
            const isPurchasing = purchasing === p.price_id;
            return (
              <div key={p.price_id} className="border border-border/60 rounded-xl p-4 hover:border-primary/50 hover:bg-primary/5 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.product_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{credits.toLocaleString()} AI credits</p>
                  </div>
                  <span className="text-lg font-bold text-primary">${price.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => handleBuy(p.price_id)}
                  disabled={!!purchasing}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isPurchasing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Buy Now
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Secure checkout powered by Stripe
        </p>
      </div>
    </div>
  );
}

function CreditsDisplay({ onBuyCredits }: { onBuyCredits: () => void }) {
  const [data, setData] = useState<{ balance: number | null; unlimited: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  if (data === null) return null;

  if (data.unlimited) {
    return (
      <div className="px-2 py-2 border border-border/40 rounded-xl bg-muted/30 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Coins className="w-3.5 h-3.5" />
            <span>Credits</span>
          </div>
          <span className="text-xs font-semibold text-primary">Unlimited</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div className="h-full bg-primary rounded-full w-full" />
        </div>
      </div>
    );
  }

  const balance = data.balance ?? 0;
  const pct = Math.min(100, (balance / 50000) * 100);
  const color = pct > 50 ? "bg-green-500" : pct > 20 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="px-2 py-2 border border-border/40 rounded-xl bg-muted/30 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Coins className="w-3.5 h-3.5" />
          <span>Credits</span>
        </div>
        <span className="text-xs font-semibold text-foreground">{balance.toLocaleString()}</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <button
        onClick={onBuyCredits}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1"
      >
        <Zap className="w-3 h-3" />
        Buy more credits
      </button>
    </div>
  );
}

export function Sidebar({ isOpen = true, onClose, isMobileDrawer = false }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const { user, logout } = useAuth() as any;

  const { data: projects, isLoading } = useListProjects();
  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();

  useEffect(() => {
    if (isCreating && templates.length === 0) {
      fetch("/api/templates")
        .then((r) => r.json())
        .then(setTemplates)
        .catch(() => {});
    }
  }, [isCreating]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const newProj = await createMutation.mutateAsync({
        data: { name: newProjectName, description: newProjectDesc, ...(selectedTemplateId !== null ? { templateId: selectedTemplateId } : {}) } as any,
      });
      setIsCreating(false);
      setShowTemplates(false);
      setSelectedTemplateId(null);
      setNewProjectName("");
      setNewProjectDesc("");
      setLocation(`/project/${newProj.id}`);
      onClose?.();
    } catch (err) {
      console.error("Failed to create project", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this project?")) {
      await deleteMutation.mutateAsync({ id });
      if (location === `/project/${id}`) {
        setLocation("/");
        onClose?.();
      }
    }
  };

  const sidebarContent = (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col shadow-2xl z-20 shrink-0">
      <div className="p-6 border-b border-border/50 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
          <div className="group-hover:scale-105 transition-transform duration-300">
            <ProntoLogoMark size={40} />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-foreground tracking-tight">Pronto</h1>
            <p className="text-xs text-muted-foreground font-medium">Workspace</p>
          </div>
        </Link>
        {isMobileDrawer && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Projects</h2>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-md transition-colors text-muted-foreground"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence>
          {isCreating && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 bg-muted/50 p-3 rounded-xl border border-border/50 overflow-hidden"
              onSubmit={handleCreate}
            >
              <input
                autoFocus
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-2"
                placeholder="Project Name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
              <input
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-2"
                placeholder="Description (optional)"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
              />

              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground mb-2 px-1 transition-colors"
              >
                <span>{selectedTemplateId !== null ? `Template: ${templates.find(t => t.id === selectedTemplateId)?.name}` : "Choose a template (optional)"}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
              </button>

              {showTemplates && (
                <div className="mb-3">
                  <TemplatePicker
                    templates={templates}
                    selectedId={selectedTemplateId}
                    onSelect={setSelectedTemplateId}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center"
                >
                  {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setShowTemplates(false); setSelectedTemplateId(null); }}
                  className="flex-1 bg-muted hover:bg-muted-foreground/20 text-foreground text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <ul className="space-y-1.5">
            {projects?.map((project) => {
              const isActive = location === `/project/${project.id}`;
              return (
                <li key={project.id}>
                  <Link
                    href={`/project/${project.id}`}
                    onClick={onClose}
                    className={`
                      group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                      ${isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <FolderGit2 className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                      <div className="truncate">
                        <span className="truncate block">{project.name}</span>
                        {isActive && (
                          <span className="text-[10px] text-primary/70 block font-normal">Active</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, project.id)}
                      disabled={deleteMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/20 hover:text-destructive rounded-md transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </li>
              );
            })}
            {projects?.length === 0 && !isCreating && (
              <div className="text-center py-8 px-4 text-xs text-muted-foreground">
                No projects yet. Create one to get started!
              </div>
            )}
          </ul>
        )}
      </div>

      <div className="p-4 border-t border-border/50 space-y-2">
        <CreditsDisplay onBuyCredits={() => setShowBuyCredits(true)} />

        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-3 px-2 py-2 hover:bg-muted/50 rounded-xl cursor-pointer transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">AI Provider</p>
            <p className="text-xs text-muted-foreground truncate">Configure API settings</p>
          </div>
        </button>

        <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="avatar" className="w-8 h-8 rounded-full shrink-0 object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 shrink-0 flex items-center justify-center text-white text-xs font-bold">
              {(user?.firstName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user?.email ?? "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      {showBuyCredits && <BuyCreditsModal onClose={() => setShowBuyCredits(false)} />}
    </div>
  );

  if (isMobileDrawer) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 md:hidden h-full"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return <div className="hidden md:flex h-screen shrink-0">{sidebarContent}</div>;
}
