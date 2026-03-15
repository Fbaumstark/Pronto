import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, SquareSquare, Paperclip, X, CheckCircle2, FileCode2, Zap, FileText } from "lucide-react";
import { useListProjectMessages } from "@workspace/api-client-react";
import { useChatStream, type MessageAttachment } from "@/hooks/use-chat-stream";
import ReactMarkdown from "react-markdown";
import { cleanResponseForDisplay, cleanStreamingForDisplay } from "@/lib/clean-response";
import { BuyCreditsModal } from "@/components/payments/BuyCreditsModal";

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const TEXT_EXTS = ["txt", "md", "csv", "json", "js", "ts", "jsx", "tsx", "html", "css", "py", "rb", "go", "rs", "java", "c", "cpp", "h", "xml", "yaml", "yml", "toml", "sh", "sql"];

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function getFileKind(file: File): "image" | "pdf" | "text" | "unsupported" {
  if (IMAGE_MIMES.includes(file.type)) return "image";
  if (file.type === "application/pdf") return "pdf";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (TEXT_EXTS.includes(ext)) return "text";
  if (file.type.startsWith("text/")) return "text";
  return "unsupported";
}

function getStreamingCodeInfo(raw: string) {
  const matches = [...raw.matchAll(/<file name="([^"]+)">/g)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  const afterTag = raw.slice(last.index! + last[0].length);
  const closeIdx = afterTag.indexOf("</file>");
  const fileContent = closeIdx === -1 ? afterTag : afterTag.slice(0, closeIdx);
  const allLines = fileContent.split("\n");
  const visibleLines = allLines.slice(-4).filter((l) => l.trim());
  return { filename: last[1], lines: allLines.length, visibleLines };
}

interface ChatPanelProps {
  projectId: number;
  onFileUpdated?: () => void;
}

export function ChatPanel({ projectId, onFileUpdated }: ChatPanelProps) {
  const draftKey = `chat-draft-${projectId}`;
  const [input, setInput] = useState(() => localStorage.getItem(draftKey) ?? "");
  const [attachedFile, setAttachedFile] = useState<{
    attachment: MessageAttachment;
    previewUrl?: string;
    fileName: string;
    kind: "image" | "pdf" | "text";
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: messages, isLoading } = useListProjectMessages(projectId);
  const { sendMessage, isStreaming, streamingContent, fileUpdateVersion, stopStream, error, outOfCredits, clearOutOfCredits } = useChatStream(projectId);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const scrollToBottom = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  useEffect(() => { scrollToBottom(); }, [messages, streamingContent]);

  useEffect(() => {
    if (fileUpdateVersion > 0) onFileUpdated?.();
  }, [fileUpdateVersion]);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (val) localStorage.setItem(draftKey, val);
    else localStorage.removeItem(draftKey);
  };

  const clearAttachment = () => {
    if (attachedFile?.previewUrl) URL.revokeObjectURL(attachedFile.previewUrl);
    setAttachedFile(null);
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    const kind = getFileKind(file);

    if (kind === "unsupported") {
      alert(`Unsupported file type. You can attach images (JPG, PNG, GIF, WebP), PDFs, or text/code files.`);
      return;
    }

    if (kind === "image") {
      if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5 MB."); return; }
      const imageData = await readFileAsBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setAttachedFile({
        attachment: { type: "image", imageData, imageMimeType: file.type, previewUrl },
        previewUrl,
        fileName: file.name,
        kind: "image",
      });
    } else if (kind === "pdf") {
      if (file.size > 10 * 1024 * 1024) { alert("PDF must be under 10 MB."); return; }
      const imageData = await readFileAsBase64(file);
      setAttachedFile({
        attachment: { type: "pdf", imageData, fileName: file.name },
        fileName: file.name,
        kind: "pdf",
      });
    } else {
      if (file.size > 500 * 1024) { alert("Text file must be under 500 KB."); return; }
      const fileContent = await readFileAsText(file);
      setAttachedFile({
        attachment: { type: "text", fileContent, fileName: file.name },
        fileName: file.name,
        kind: "text",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || isStreaming) return;
    const defaultPrompts: Record<string, string> = {
      image: "Make changes based on this image.",
      pdf: "Review this document and help me build something based on it.",
      text: "Here is a file for context.",
    };
    const text = input.trim() || (attachedFile ? defaultPrompts[attachedFile.kind] : "");
    sendMessage(text, attachedFile?.attachment);
    setInput("");
    localStorage.removeItem(draftKey);
    clearAttachment();
  };

  const displayStreamContent = cleanStreamingForDisplay(streamingContent);
  const codeInfo = isStreaming ? getStreamingCodeInfo(streamingContent) : null;
  const isWritingCode = !!codeInfo;

  return (
    <div className="flex flex-col h-full bg-card/50">
      <div className="h-14 border-b border-border flex items-center px-6 shrink-0 bg-background/50 backdrop-blur-md">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Assistant
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {messages?.length === 0 && !streamingContent && (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-lg font-medium mb-2">How can I help you build?</h4>
                <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
                  Describe the app you want to create, and I'll generate the code for you.
                </p>
              </div>
            )}

            {messages?.map((msg) => (
              <div key={msg.id} className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}>
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center shadow-sm ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border text-foreground'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[85%] space-y-1.5 ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                  {/* Image thumbnail */}
                  {(msg as any)._imagePreview && (
                    <img
                      src={(msg as any)._imagePreview}
                      alt="Attached"
                      className="max-w-[180px] max-h-[120px] rounded-xl border border-border/60 object-cover shadow-sm"
                    />
                  )}
                  {/* Non-image file badge */}
                  {(msg as any)._fileName && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 border border-border/60 rounded-lg px-2.5 py-1.5">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[160px]">{(msg as any)._fileName}</span>
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 md:px-5 py-3 md:py-4 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-primary/10 border border-primary/20 text-foreground'
                      : 'bg-muted/30 border border-border text-foreground prose prose-invert prose-sm max-w-none'
                  }`}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  ) : (
                    <>
                      <ReactMarkdown>{cleanResponseForDisplay(msg.content)}</ReactMarkdown>
                      {cleanResponseForDisplay(msg.content) !== msg.content && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-primary/80 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Code updated in preview
                        </div>
                      )}
                    </>
                  )}
                  </div>
                </div>
              </div>
            ))}

            {isStreaming && (
              <div className="flex gap-3 md:gap-4 animate-fade-in">
                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-muted border border-border text-foreground shadow-sm">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="max-w-[85%] space-y-2">
                  {displayStreamContent && (
                    <div className="rounded-2xl px-4 md:px-5 py-3 md:py-4 shadow-sm bg-muted/30 border border-border text-foreground prose prose-invert prose-sm">
                      <ReactMarkdown>{displayStreamContent}</ReactMarkdown>
                    </div>
                  )}

                  {isWritingCode && (
                    <div className="rounded-2xl overflow-hidden border border-primary/30 bg-black/60 shadow-lg shadow-primary/10">
                      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b border-primary/20">
                        <FileCode2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-xs font-mono text-primary font-medium truncate flex-1">{codeInfo!.filename}</span>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{codeInfo!.lines} lines</span>
                        <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
                      </div>
                      <div className="px-3 py-2.5 space-y-0.5">
                        {codeInfo!.visibleLines.map((line, i) => (
                          <div key={i} className="font-mono text-[10px] text-green-400/80 truncate leading-relaxed">{line}</div>
                        ))}
                        <div className="font-mono text-[10px] text-green-400 flex items-center gap-0.5 leading-relaxed">
                          <span className="inline-block w-1.5 h-3 bg-green-400 animate-pulse rounded-sm" />
                        </div>
                      </div>
                    </div>
                  )}

                  {!displayStreamContent && !isWritingCode && (
                    <div className="rounded-2xl px-4 py-3 shadow-sm bg-muted/30 border border-border">
                      <div className="flex gap-1.5 items-center h-5">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {outOfCredits && (
              <div className="mx-auto max-w-sm bg-amber-500/10 border border-amber-500/40 rounded-xl px-4 py-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <p className="text-sm font-semibold text-amber-300">You've run out of credits</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Add credits to keep building your app.</p>
                <button
                  onClick={() => setShowBuyModal(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Buy Credits
                </button>
              </div>
            )}

            {error && !outOfCredits && (
              <div className="mx-auto max-w-sm bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive text-center">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 md:p-4 border-t border-border bg-background/50 backdrop-blur-md shrink-0">
        {/* Attachment preview */}
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2.5">
            {attachedFile.kind === "image" && attachedFile.previewUrl ? (
              <div className="relative inline-flex shrink-0">
                <img
                  src={attachedFile.previewUrl}
                  alt="Attachment"
                  className="h-14 w-auto max-w-[100px] rounded-lg border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={clearAttachment}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="relative flex items-center gap-2 bg-muted/50 border border-border/60 rounded-lg px-3 py-2 pr-7 max-w-[220px]">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-foreground truncate">{attachedFile.fileName}</span>
                <button
                  type="button"
                  onClick={clearAttachment}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-destructive/20 hover:bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground leading-snug">
              {attachedFile.kind === "image"
                ? "Image attached — Claude will see this with your message"
                : attachedFile.kind === "pdf"
                ? "PDF attached — Claude will read this document"
                : "File attached — Claude will see its contents"}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={attachedFile ? "Describe what to do with this file (or just hit send)…" : "Type a message to build your app..."}
            className="w-full bg-muted/50 border border-border rounded-xl pl-11 pr-14 py-3 min-h-[60px] max-h-[160px] resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-muted-foreground/70 transition-all duration-200 shadow-inner"
          />

          {/* Attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            title="Attach a file (image, PDF, or text/code file)"
            className={`absolute left-3 bottom-3 p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
              attachedFile ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/*,.txt,.md,.csv,.json,.js,.ts,.jsx,.tsx,.html,.css,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.xml,.yaml,.yml,.toml,.sh,.sql"
            className="hidden"
            onChange={handleFilePick}
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={stopStream}
              className="absolute right-3 bottom-3 p-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
              title="Stop generating"
            >
              <SquareSquare className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={(!input.trim() && !attachedFile) || isStreaming}
              className="absolute right-3 bottom-3 p-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {showBuyModal && (
        <BuyCreditsModal
          heading="Out of Credits"
          subheading="You've used all your free credits. Add more to keep building."
          onClose={() => { setShowBuyModal(false); clearOutOfCredits(); }}
        />
      )}
    </div>
  );
}
