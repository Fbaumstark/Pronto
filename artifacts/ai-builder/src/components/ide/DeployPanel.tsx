import { useState, useEffect } from "react";
import { Globe, Rocket, Loader2, CheckCircle2, Copy, ExternalLink, X, Link2 } from "lucide-react";

interface Deployment {
  id: number;
  projectId: number;
  slug: string;
  customDomain: string | null;
  isLive: boolean;
  publishedAt: string;
  updatedAt: string;
}

interface DeployPanelProps {
  projectId: number;
}

export function DeployPanel({ projectId }: DeployPanelProps) {
  const [deployment, setDeployment] = useState<Deployment | null | undefined>(undefined);
  const [isDeploying, setIsDeploying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [showDomain, setShowDomain] = useState(false);
  const [isSavingDomain, setIsSavingDomain] = useState(false);

  const baseUrl = window.location.origin;

  useEffect(() => {
    fetch(`/api/projects/${projectId}/deployment`)
      .then((r) => r.json())
      .then((d) => {
        setDeployment(d);
        if (d?.customDomain) setDomainInput(d.customDomain);
      })
      .catch(() => setDeployment(null));
  }, [projectId]);

  const deploy = async () => {
    setIsDeploying(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy`, { method: "POST" });
      const d = await res.json();
      setDeployment(d);
    } finally {
      setIsDeploying(false);
    }
  };

  const undeploy = async () => {
    if (!confirm("Take this app offline?")) return;
    await fetch(`/api/projects/${projectId}/undeploy`, { method: "POST" });
    setDeployment((d) => d ? { ...d, isLive: false } : d);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveDomain = async () => {
    setIsSavingDomain(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/deployment/domain`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDomain: domainInput.trim() }),
      });
      const d = await res.json();
      setDeployment(d);
      setShowDomain(false);
    } finally {
      setIsSavingDomain(false);
    }
  };

  const publishedUrl = deployment?.isLive ? `${baseUrl}/api/p/${deployment.slug}` : null;
  const customUrl = deployment?.customDomain ? `https://${deployment.customDomain}` : null;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Publish App</h3>
      </div>

      {deployment === undefined ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : deployment === null || !deployment.isLive ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Deploy your app to get a public URL that anyone can visit — no sign-in required.
          </p>
          <button
            onClick={deploy}
            disabled={isDeploying}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            {isDeploying ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Deploying…</>
            ) : (
              <><Rocket className="w-4 h-4" /> {deployment ? "Re-deploy" : "Deploy Now"}</>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Your app is live!</span>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Public URL</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={publishedUrl ?? ""}
                className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground font-mono truncate"
              />
              <button onClick={() => copyUrl(publishedUrl!)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <a href={publishedUrl!} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {customUrl && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Custom Domain</p>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-xs text-foreground font-mono truncate">{customUrl}</span>
                <a href={customUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={() => setShowDomain(!showDomain)}
              className="w-full flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-medium py-2 rounded-lg transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              {deployment.customDomain ? "Update custom domain" : "Add custom domain"}
            </button>

            {showDomain && (
              <div className="bg-muted/30 rounded-xl p-3 space-y-2 border border-border/50">
                <p className="text-xs text-muted-foreground">Enter your domain (e.g. <code className="text-primary">myapp.com</code>). Then add a CNAME record pointing to <code className="text-primary text-[10px]">{window.location.hostname}</code> in your DNS settings.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="myapp.com"
                    className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button onClick={saveDomain} disabled={isSavingDomain} className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60">
                    {isSavingDomain ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                  </button>
                </div>
                {deployment.customDomain && (
                  <button onClick={() => { setDomainInput(""); saveDomain(); }} className="text-xs text-destructive hover:underline">Remove custom domain</button>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={deploy}
                disabled={isDeploying}
                className="flex-1 flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                {isDeploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                Redeploy
              </button>
              <button onClick={undeploy} className="flex-1 flex items-center justify-center gap-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-medium py-2 rounded-lg transition-colors">
                <X className="w-3 h-3" /> Take offline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
