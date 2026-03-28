import { useState, useEffect, useRef } from "react";
import { RotateCw, ExternalLink, Monitor, Smartphone, Tablet, Loader2, MousePointer, MousePointerClick } from "lucide-react";
import type { SelectedElement } from "@/hooks/use-chat-stream";

interface PreviewPanelProps {
  projectId: number;
  refreshSignal?: number;
  onElementSelected?: (el: SelectedElement) => void;
}

export function PreviewPanel({ projectId, refreshSignal = 0, onElementSelected }: PreviewPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectorMode, setSelectorMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const prevSignalRef = useRef(refreshSignal);

  useEffect(() => {
    if (refreshSignal !== prevSignalRef.current) {
      prevSignalRef.current = refreshSignal;
      const t = setTimeout(() => setRefreshKey((k) => k + 1), 400);
      return () => clearTimeout(t);
    }
  }, [refreshSignal]);

  // When selector mode changes, message the iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: selectorMode ? 'pronto-enable-selector' : 'pronto-disable-selector' },
      '*'
    );
  }, [selectorMode]);

  // When iframe reloads and selector mode is on, re-enable it
  const handleIframeLoad = () => {
    setIsLoading(false);
    if (selectorMode && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'pronto-enable-selector' }, '*');
    }
  };

  // Listen for element selections from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'pronto-element-selected') return;
      const el: SelectedElement = {
        selector: e.data.selector,
        tag: e.data.tag,
        text: e.data.text,
      };
      setSelectorMode(false);
      onElementSelected?.(el);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onElementSelected]);

  const toggleSelectorMode = () => {
    setSelectorMode((v) => !v);
  };

  const viewWidth = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  const previewUrl = `/api/projects/${projectId}/preview?v=${refreshKey}`;

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="h-12 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4 w-full max-w-3xl">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>

          <div className="flex items-center gap-2 flex-1 ml-4">
            <button
              onClick={() => { setIsLoading(true); setRefreshKey((k) => k + 1); }}
              className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
              title="Reload preview"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <div className="flex-1 bg-muted/50 border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground font-mono flex items-center justify-between">
              <span className="truncate">localhost:3000</span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Element selector toggle */}
          <button
            onClick={toggleSelectorMode}
            title={selectorMode ? "Click an element in the preview to select it (press again to cancel)" : "Pick an element to tell Claude what to fix"}
            className={`p-1.5 rounded-md transition-colors ${
              selectorMode
                ? "bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/40"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {selectorMode ? <MousePointerClick className="w-4 h-4" /> : <MousePointer className="w-4 h-4" />}
          </button>

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
      </div>

      {selectorMode && (
        <div className="px-4 py-1.5 bg-violet-500/10 border-b border-violet-500/20 flex items-center gap-2">
          <MousePointerClick className="w-3 h-3 text-violet-400 shrink-0 animate-pulse" />
          <span className="text-xs text-violet-300">Click any element in the preview to select it — Claude will know exactly what to fix</span>
          <button onClick={() => setSelectorMode(false)} className="ml-auto text-xs text-violet-400 hover:text-violet-200">Cancel</button>
        </div>
      )}

      <div className="flex-1 bg-neutral-900 overflow-hidden flex items-center justify-center p-2 sm:p-4 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 z-10 pointer-events-none">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        <div
          className="bg-white rounded-md overflow-hidden shadow-2xl transition-all duration-300 ring-1 ring-border/50 h-full"
          style={{ width: viewWidth[viewMode], maxWidth: '100%' }}
        >
          <iframe
            ref={iframeRef}
            key={refreshKey}
            src={previewUrl}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin"
            title="Preview"
            onLoad={handleIframeLoad}
          />
        </div>
      </div>
    </div>
  );
}
