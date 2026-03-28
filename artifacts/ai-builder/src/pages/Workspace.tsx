import { useState, useCallback, useEffect } from "react";
import { useParams } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { api } from "@/lib/api-base";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { ChatPanel } from "@/components/ide/ChatPanel";
import { EditorPanel } from "@/components/ide/EditorPanel";
import { PreviewPanel } from "@/components/ide/PreviewPanel";
import { VersionHistoryPanel } from "@/components/ide/VersionHistoryPanel";
import { DeployPanel } from "@/components/ide/DeployPanel";
import type { SelectedElement } from "@/hooks/use-chat-stream";
import {
  Loader2, MessageSquare, Code2, Monitor, Rocket, History,
  CheckCircle2, Copy, Check, ExternalLink, ChevronDown, Settings2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type MobileTab = "chat" | "code" | "preview";
type RightPanelTab = "deploy" | "history" | null;

interface Deployment {
  id: number;
  slug: string;
  customDomain: string | null;
  isLive: boolean;
}

function PublishBar({
  projectId,
  onOpenPanel,
}: {
  projectId: number;
  onOpenPanel: () => void;
}) {
  const [deployment, setDeployment] = useState<Deployment | null | undefined>(undefined);
  const [isDeploying, setIsDeploying] = useState(false);
  const [copied, setCopied] = useState(false);

  const baseUrl = window.location.origin;

  const load = useCallback(() => {
    api(`/api/projects/${projectId}/deployment`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setDeployment)
      .catch(() => setDeployment(null));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const deploy = async () => {
    setIsDeploying(true);
    try {
      const res = await api(`/api/projects/${projectId}/deploy`, { method: "POST" });
      const d = await res.json();
      setDeployment(d);
    } finally {
      setIsDeploying(false);
    }
  };

  const liveUrl = deployment?.isLive
    ? (deployment.customDomain
        ? `https://${deployment.customDomain}`
        : `${baseUrl}/api/p/${deployment.slug}`)
    : null;

  const copyUrl = () => {
    if (!liveUrl) return;
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (deployment === undefined) {
    return <div className="w-24 h-8 bg-muted/40 rounded-lg animate-pulse" />;
  }

  if (liveUrl) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg pl-2.5 pr-1.5 py-1.5 max-w-xs">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          <span className="text-xs text-green-400 font-medium truncate max-w-[180px]">{liveUrl}</span>
          <button
            onClick={copyUrl}
            title="Copy URL"
            className="p-1 rounded hover:bg-green-500/20 text-green-400 transition-colors shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="p-1 rounded hover:bg-green-500/20 text-green-400 transition-colors shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <button
          onClick={onOpenPanel}
          title="Deploy settings"
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={deploy}
        disabled={isDeploying}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
      >
        {isDeploying ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publishing…</>
        ) : (
          <><Rocket className="w-3.5 h-3.5" /> Publish</>
        )}
      </button>
      {deployment !== null && !deployment?.isLive && (
        <button
          onClick={onOpenPanel}
          title="Deploy settings"
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function Workspace() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);
  const { data: project, isLoading, error, refetch } = useGetProject(projectId);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>("chat");
  const [rightPanel, setRightPanel] = useState<RightPanelTab>(null);
  const [previewRefreshSignal, setPreviewRefreshSignal] = useState(0);
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [activeFileName, setActiveFileName] = useState<string>("");
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);

  const handleFileUpdated = () => setPreviewRefreshSignal((v) => v + 1);

  const handleActiveFileChange = (fileId: number, filename: string) => {
    setActiveFileId(fileId);
    setActiveFileName(filename);
  };

  const toggleRightPanel = (tab: RightPanelTab) => {
    setRightPanel((prev) => (prev === tab ? null : tab));
  };

  const handleVersionRestored = useCallback(() => {
    refetch();
    setRightPanel(null);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-destructive flex-col gap-4">
        <p className="text-xl font-bold">Project not found</p>
        <p className="text-muted-foreground">It may have been deleted or the URL is incorrect.</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
        <MobileTopBar onMenuClick={() => setSidebarOpen(true)} title={project.name} />

        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobileDrawer
        />

        <div className="flex-1 overflow-hidden relative">
          <div className={`absolute inset-0 ${activeTab === "chat" ? "flex flex-col" : "hidden"}`}>
            <ChatPanel projectId={project.id} onFileUpdated={handleFileUpdated} activeFileId={activeFileId} activeFileName={activeFileName} selectedElement={selectedElement} onClearSelectedElement={() => setSelectedElement(null)} />
          </div>
          <div className={`absolute inset-0 ${activeTab === "code" ? "flex flex-col" : "hidden"}`}>
            <EditorPanel projectId={project.id} activeFileId={activeFileId} onActiveFileChange={handleActiveFileChange} />
          </div>
          <div className={`absolute inset-0 ${activeTab === "preview" ? "flex flex-col" : "hidden"}`}>
            <PreviewPanel projectId={project.id} refreshSignal={previewRefreshSignal} onElementSelected={(el) => { setSelectedElement(el); setActiveTab("chat"); }} />
          </div>
        </div>

        <div className="h-16 border-t border-border bg-card flex items-center shrink-0 z-30">
          {(["chat", "code", "preview"] as MobileTab[]).map((tab) => {
            const Icon = tab === "chat" ? MessageSquare : tab === "code" ? Code2 : Monitor;
            const label = tab === "chat" ? "Chat" : tab === "code" ? "Code" : "Preview";
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span className={`text-[11px] font-medium ${isActive ? "text-primary" : ""}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* ── TOP TOOLBAR ── */}
        <div className="h-12 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">{project.name}</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => toggleRightPanel("history")}
              title="Version History"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                rightPanel === "history"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>

            <PublishBar
              projectId={project.id}
              onOpenPanel={() => toggleRightPanel("deploy")}
            />
          </div>
        </div>

        {/* ── MAIN PANELS ── */}
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-hidden">
            <PanelGroup direction="horizontal">
              <Panel defaultSize={35} minSize={25} className="z-10">
                <ChatPanel projectId={project.id} onFileUpdated={handleFileUpdated} activeFileId={activeFileId} activeFileName={activeFileName} selectedElement={selectedElement} onClearSelectedElement={() => setSelectedElement(null)} />
              </Panel>

              <PanelResizeHandle className="w-1.5 bg-border hover:bg-primary/50 transition-colors cursor-col-resize z-20 flex items-center justify-center">
                <div className="h-8 w-0.5 bg-muted-foreground/30 rounded-full" />
              </PanelResizeHandle>

              <Panel defaultSize={65} minSize={30}>
                <PanelGroup direction="vertical">
                  <Panel defaultSize={50} minSize={20}>
                    <EditorPanel projectId={project.id} activeFileId={activeFileId} onActiveFileChange={handleActiveFileChange} />
                  </Panel>

                  <PanelResizeHandle className="h-1.5 bg-border hover:bg-primary/50 transition-colors cursor-row-resize z-20 flex items-center justify-center">
                    <div className="w-8 h-0.5 bg-muted-foreground/30 rounded-full" />
                  </PanelResizeHandle>

                  <Panel defaultSize={50} minSize={20}>
                    <PreviewPanel projectId={project.id} refreshSignal={previewRefreshSignal} onElementSelected={setSelectedElement} />
                  </Panel>
                </PanelGroup>
              </Panel>
            </PanelGroup>
          </div>

          {rightPanel && (
            <div className="w-72 border-l border-border bg-card overflow-y-auto flex flex-col shrink-0">
              <div className="px-4 pt-4 pb-2 border-b border-border/50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  {rightPanel === "deploy" ? "Publish Settings" : "Version History"}
                </h2>
                <button
                  onClick={() => setRightPanel(null)}
                  className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors text-xs"
                >
                  ✕
                </button>
              </div>

              {rightPanel === "deploy" && (
                <DeployPanel projectId={project.id} />
              )}

              {rightPanel === "history" && (
                <div className="flex-1">
                  <VersionHistoryPanel
                    projectId={project.id}
                    onRestored={handleVersionRestored}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
