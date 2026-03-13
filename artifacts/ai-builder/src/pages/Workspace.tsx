import { useState } from "react";
import { useParams } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { ChatPanel } from "@/components/ide/ChatPanel";
import { EditorPanel } from "@/components/ide/EditorPanel";
import { PreviewPanel } from "@/components/ide/PreviewPanel";
import { Loader2, MessageSquare, Code2, Monitor } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type MobileTab = "chat" | "code" | "preview";

export function Workspace() {
  const params = useParams();
  const projectId = parseInt(params.id || "0", 10);
  const { data: project, isLoading, error } = useGetProject(projectId);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>("chat");

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

        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" && <ChatPanel projectId={project.id} />}
          {activeTab === "code" && <EditorPanel projectId={project.id} />}
          {activeTab === "preview" && <PreviewPanel projectId={project.id} />}
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
                {isActive && (
                  <div className="absolute bottom-0 h-0.5 w-12 bg-primary rounded-full" style={{ position: "static" }} />
                )}
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

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={35} minSize={25} className="z-10">
            <ChatPanel projectId={project.id} />
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
                <PreviewPanel projectId={project.id} />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
