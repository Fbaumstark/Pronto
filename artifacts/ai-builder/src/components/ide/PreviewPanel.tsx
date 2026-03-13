import { useState, useEffect } from "react";
import { RotateCw, ExternalLink, Monitor, Smartphone, Tablet } from "lucide-react";
import { useListProjectFiles } from "@workspace/api-client-react";

export function PreviewPanel({ projectId }: { projectId: number }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop'|'tablet'|'mobile'>('desktop');
  const { data: files } = useListProjectFiles(projectId);

  // Auto-refresh preview occasionally if files change
  useEffect(() => {
    // Small delay to let files save first
    const timer = setTimeout(() => {
      setRefreshKey(prev => prev + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [files]);

  const viewWidth = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px'
  };

  const previewUrl = `/api/projects/${projectId}/preview`;

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Browser Header */}
      <div className="h-12 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4 w-full max-w-3xl">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          
          <div className="flex items-center gap-2 flex-1 ml-4">
            <button 
              onClick={() => setRefreshKey(k => k + 1)}
              className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <div className="flex-1 bg-muted/50 border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground font-mono flex items-center justify-between">
              <span className="truncate">localhost:3000</span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border">
          <button 
            onClick={() => setViewMode('desktop')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'desktop' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('tablet')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'tablet' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('mobile')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'mobile' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Iframe Container */}
      <div className="flex-1 bg-neutral-900 overflow-hidden flex items-center justify-center p-2 sm:p-4">
        <div 
          className="bg-white rounded-md overflow-hidden shadow-2xl transition-all duration-300 ring-1 ring-border/50"
          style={{ width: viewWidth[viewMode], height: '100%', maxWidth: '100%' }}
        >
          <iframe
            key={refreshKey}
            src={previewUrl}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin"
            title="Preview"
          />
        </div>
      </div>
    </div>
  );
}
