import { useState, useEffect } from "react";
import { useListProjectFiles, useUpdateProjectFile } from "@workspace/api-client-react";
import { FileCode2, FileJson, FileText, File, CheckCircle2, Loader2, ChevronDown } from "lucide-react";
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";

type SaveStatus = "saved" | "saving" | "unsaved";

export function EditorPanel({ projectId }: { projectId: number }) {
  const { data: files } = useListProjectFiles(projectId);
  const updateMutation = useUpdateProjectFile();
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [localCode, setLocalCode] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [showFileList, setShowFileList] = useState(false);
  const debouncedCode = useDebounce(localCode, 1200);
  const isMobile = useIsMobile();

  const activeFile = files?.find(f => f.id === activeFileId) || files?.[0];

  useEffect(() => {
    if (activeFile) {
      setLocalCode(activeFile.content);
      setSaveStatus("saved");
      if (!activeFileId) setActiveFileId(activeFile.id);
    }
  }, [activeFile?.id]);

  useEffect(() => {
    if (activeFile && debouncedCode !== activeFile.content && activeFileId) {
      setSaveStatus("saving");
      updateMutation.mutate(
        { projectId, fileId: activeFileId, data: { content: debouncedCode } },
        { onSuccess: () => setSaveStatus("saved"), onError: () => setSaveStatus("unsaved") }
      );
    }
  }, [debouncedCode]);

  const handleCodeChange = (val: string) => {
    setLocalCode(val);
    setSaveStatus("unsaved");
  };

  const getLanguageExtension = (filename: string) => {
    if (filename.endsWith('.js') || filename.endsWith('.ts') || filename.endsWith('.tsx')) return javascript({ jsx: true, typescript: true });
    if (filename.endsWith('.html')) return html();
    if (filename.endsWith('.css')) return css();
    return javascript();
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.js') || filename.endsWith('.ts') || filename.endsWith('.tsx')) return <FileCode2 className="w-4 h-4 text-yellow-400" />;
    if (filename.endsWith('.json')) return <FileJson className="w-4 h-4 text-green-400" />;
    if (filename.endsWith('.html')) return <FileCode2 className="w-4 h-4 text-orange-500" />;
    if (filename.endsWith('.css')) return <FileCode2 className="w-4 h-4 text-blue-400" />;
    return <FileText className="w-4 h-4 text-muted-foreground" />;
  };

  const SaveIndicator = () => {
    if (saveStatus === "saving") return (
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" /> Saving…
      </span>
    );
    if (saveStatus === "saved") return (
      <span className="flex items-center gap-1 text-[10px] text-green-500">
        <CheckCircle2 className="w-3 h-3" /> Saved
      </span>
    );
    return (
      <span className="flex items-center gap-1 text-[10px] text-yellow-500">
        Unsaved changes
      </span>
    );
  };

  const editorNode = activeFile ? (
    <CodeMirror
      value={localCode}
      height="100%"
      theme={vscodeDark}
      extensions={[getLanguageExtension(activeFile.filename)]}
      onChange={handleCodeChange}
      className="h-full text-[13px] font-mono leading-relaxed"
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        foldGutter: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
      }}
    />
  ) : (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 bg-background">
      <File className="w-10 h-10 opacity-20" />
      <p className="text-sm">No files yet. Start chatting to generate code.</p>
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden">
        <div className="h-10 bg-card border-b border-border flex items-center shrink-0 px-2 relative">
          <button
            onClick={() => setShowFileList(prev => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-sm text-foreground flex-1 min-w-0"
          >
            {activeFile && getFileIcon(activeFile.filename)}
            <span className="flex-1 text-left font-medium text-sm truncate">
              {activeFile?.filename ?? "No file selected"}
            </span>
            <SaveIndicator />
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ml-1 shrink-0 ${showFileList ? "rotate-180" : ""}`} />
          </button>

          {showFileList && (
            <div className="absolute top-10 left-0 right-0 z-50 bg-card border border-border rounded-b-xl shadow-xl overflow-hidden">
              {files?.map(file => (
                <button
                  key={file.id}
                  onClick={() => { setActiveFileId(file.id); setLocalCode(file.content); setSaveStatus("saved"); setShowFileList(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                    activeFile?.id === file.id
                      ? 'bg-primary/20 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {getFileIcon(file.filename)}
                  <span className="truncate">{file.filename}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-[#1e1e1e]">
          {editorNode}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background border-b border-border overflow-hidden">
      <div className="w-48 bg-card/80 border-r border-border flex flex-col shrink-0">
        <div className="h-10 flex items-center px-4 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Explorer
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {files?.map(file => (
            <button
              key={file.id}
              onClick={() => { setActiveFileId(file.id); setLocalCode(file.content); setSaveStatus("saved"); }}
              className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors ${
                activeFile?.id === file.id
                  ? 'bg-primary/20 text-primary border-r-2 border-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground border-r-2 border-transparent'
              }`}
            >
              {getFileIcon(file.filename)}
              <span className="truncate">{file.filename}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
        {activeFile ? (
          <>
            <div className="h-10 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2 text-foreground text-sm">
                {getFileIcon(activeFile.filename)}
                <span>{activeFile.filename}</span>
              </div>
              <SaveIndicator />
            </div>
            <div className="flex-1 overflow-auto">
              {editorNode}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4 bg-background">
            <File className="w-12 h-12 opacity-20" />
            <p>Select a file to edit</p>
          </div>
        )}
      </div>
    </div>
  );
}
