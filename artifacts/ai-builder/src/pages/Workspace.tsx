import { useState, useCallback } from "react";
import { useParams } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { ChatPanel } from "@/components/ide/ChatPanel";
import { EditorPanel } from "@/components/ide/EditorPanel";
import { PreviewPanel } from "@/components/ide/PreviewPanel";
import { VersionHistoryPanel } from "@/components/ide/VersionHistoryPanel";
import { DeployPanel } from "@/components/ide/DeployPanel";
import { Loader2, MessageSquare, Code2, Monitor, Rocket, History } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type MobileTab = "chat" | "code" | "preview";
type RightPanelTab = "deploy" | "history" | null;

export function Workspace() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);
  const { data: project, isLoading, error, refetch } = useGetProject(projectId);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>("chat");
  const [rightPanel, setRightPanel] = useState<RightPanelTab>(null);
  const [previewRefreshSignal, setPreviewRefreshSignal] = useState(0);

  const handleFileUpdated = () => setPreviewRefreshSignal((v) => v + 1);

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
            <ChatPanel projectId={project.id} onFileUpdated={handleFileUpdated} />
          </div>
          <div className={`absolute inset-0 ${activeTab === "code" ? "flex flex-col" : "hidden"}`}>
            <EditorPanel projectId={project.id} />
          </div>
          <div className={`absolute inset-0 ${activeTab === "preview" ? "flex flex-col" : "hidden"}`}>
            <PreviewPanel projectId={project.id} refreshSignal={previewRefreshSignal} />
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

      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="horizontal">
            <Panel defaultSize={35} minSize={25} className="z-10">
              <ChatPanel projectId={project.id} onFileUpdated={handleFileUpdated} />
            </Panel>

            <PanelResizeHandle className="w-1.5 bg-border hover:bg-primary/50 transition-colors cursor-col-resize z-20 flex items-center justify-center">
              <div className="h-8 w-0.5 bg-muted-foreground/30 rounded-full" />
            </PanelResizeHandle>

            <Panel defaultSize={65} minSize={30}>
              <PanelGroup direction="vertical">
                <Panel defaultSize={50} minSize={20}>
                  <EditorPanel projectId={project.id} />
                </Panel>

                <PanelResizeHandle className="h-1.5 bg-border hover:bg-primary/50 transition-colors cursor-row-resize z-20 flex items-center justify-center">
                  <div className="w-8 h-0.5 bg-muted-foreground/30 rounded-full" />
                </PanelResizeHandle>

                <Panel defaultSize={50} minSize={20}>
                  <PreviewPanel projectId={project.id} refreshSignal={previewRefreshSignal} />
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </div>

        <div className="flex shrink-0">
          <div className="flex flex-col items-center gap-2 border-l border-border bg-card px-2 py-4">
            <button
              onClick={() => toggleRightPanel("deploy")}
              title="Deploy"
              className={`p-2.5 rounded-xl transition-colors ${
                rightPanel === "deploy"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Rocket className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleRightPanel("history")}
              title="Version History"
              className={`p-2.5 rounded-xl transition-colors ${
                rightPanel === "history"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <History className="w-4 h-4" />
            </button>
          </div>

          {rightPanel && (
            <div className="w-72 border-l border-border bg-card overflow-y-auto flex flex-col">
              <div className="px-4 pt-4 pb-2 border-b border-border/50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  {rightPanel === "deploy" ? "Deploy" : "Version History"}
                </h2>
                <button
                  onClick={() => setRightPanel(null)}
                  className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="text-xs">✕</span>
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
