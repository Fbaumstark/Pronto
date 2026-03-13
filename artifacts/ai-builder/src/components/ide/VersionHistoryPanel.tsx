import { useState } from "react";
import { History, RotateCcw, Loader2, ChevronRight, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Version {
  id: number;
  versionNumber: number;
  label: string | null;
  createdAt: string;
}

interface VersionHistoryPanelProps {
  projectId: number;
  onRestored: () => void;
}

export function VersionHistoryPanel({ projectId, onRestored }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);

  const loadVersions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`);
      const data = await res.json();
      setVersions(data);
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = () => {
    if (!isOpen && versions === null) loadVersions();
    setIsOpen(!isOpen);
  };

  const restore = async (versionId: number) => {
    if (!confirm("Restore this version? Your current files will be replaced.")) return;
    setRestoring(versionId);
    try {
      await fetch(`/api/projects/${projectId}/versions/restore/${versionId}`, { method: "POST" });
      onRestored();
      setIsOpen(false);
      setVersions(null);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="border-t border-border/50">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-sm"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <History className="w-4 h-4" />
          <span className="font-medium">Version History</span>
        </div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>

      {isOpen && (
        <div className="px-4 pb-3 space-y-1.5 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : versions?.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No versions yet. Versions are saved automatically after each AI generation.
            </p>
          ) : (
            versions?.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{v.label ?? `v${v.versionNumber}`}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => restore(v.id)}
                  disabled={restoring === v.id}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-all shrink-0 ml-2"
                >
                  {restoring === v.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3 h-3" />
                  )}
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
