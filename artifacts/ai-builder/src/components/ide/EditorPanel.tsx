import { useState, useEffect } from "react";
import { useListProjectFiles, useUpdateProjectFile } from "@workspace/api-client-react";
import { FileCode2, FileJson, FileText, File, Save } from "lucide-react";
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { useDebounce } from "@/hooks/use-debounce";

export function EditorPanel({ projectId }: { projectId: number }) {
  const { data: files } = useListProjectFiles(projectId);
  const updateMutation = useUpdateProjectFile();
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  
  // Local state for immediate editor feedback
  const [localCode, setLocalCode] = useState("");
  const debouncedCode = useDebounce(localCode, 1500);

  const activeFile = files?.find(f => f.id === activeFileId) || files?.[0];

  // Sync local code when active file changes or receives external updates
  useEffect(() => {
    if (activeFile) {
      setLocalCode(activeFile.content);
      if (!activeFileId) setActiveFileId(activeFile.id);
    }
  }, [activeFile?.id, activeFile?.content]);

  // Auto-save debounced code
  useEffect(() => {
    if (activeFileId && activeFile && debouncedCode !== activeFile.content) {
      updateMutation.mutate({
        projectId,
        fileId: activeFileId,
        data: { content: debouncedCode }
      });
    }
  }, [debouncedCode]);

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

  return (
    <div className="flex h-full bg-background border-b border-border overflow-hidden">
      {/* File Explorer Sidebar */}
      <div className="w-48 bg-card/80 border-r border-border flex flex-col shrink-0">
        <div className="h-10 flex items-center px-4 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Explorer
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {files?.map(file => (
            <button
              key={file.id}
              onClick={() => setActiveFileId(file.id)}
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

      {/* Code Editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
        {/* Editor Tabs/Header */}
        {activeFile ? (
          <>
            <div className="h-10 bg-card border-b border-border flex items-center px-2 shrink-0">
              <div className="flex items-center gap-2 px-4 py-1.5 bg-[#1e1e1e] border-t-2 border-primary text-foreground text-sm rounded-t-md">
                {getFileIcon(activeFile.filename)}
                {activeFile.filename}
                {updateMutation.isPending && <Save className="w-3 h-3 text-muted-foreground animate-pulse ml-2" />}
              </div>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <CodeMirror
                value={localCode}
                height="100%"
                theme={vscodeDark}
                extensions={[getLanguageExtension(activeFile.filename)]}
                onChange={(val) => setLocalCode(val)}
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
