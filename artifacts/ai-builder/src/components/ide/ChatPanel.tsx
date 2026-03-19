import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, SquareSquare, Paperclip, X, CheckCircle2, FileCode2, Zap, FileText, Scissors, Globe, Brain, ChevronDown, ChevronRight, ChevronUp, Coins, Clock, FileCode, Layers } from "lucide-react";
import { useListProjectMessages } from "@workspace/api-client-react";
import { useChatStream, type MessageAttachment, type RequestSummary } from "@/hooks/use-chat-stream";
import ReactMarkdown from "react-markdown";
import { cleanResponseForDisplay, cleanStreamingForDisplay } from "@/lib/clean-response";
import { BuyCreditsModal } from "@/components/payments/BuyCreditsModal";

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const TEXT_EXTS = ["txt", "md", "csv", "json", "js", "ts", "jsx", "tsx", "html", "css", "py", "rb", "go", "rs", "java", "c", "cpp", "h", "xml", "yaml", "yml", "toml", "sh", "sql"];

// $25 / 1,250,000 credits = $0.00002/credit (matches server CREDIT_VALUE_USD)
const USD_PER_CREDIT = 25 / 1_250_000;
// Sonnet pricing (conservative estimate for pre-send)
const SONNET_INPUT_USD_PER_TOKEN = 3 / 1_000_000;
const SONNET_OUTPUT_USD_PER_TOKEN = 15 / 1_000_000;
const MARKUP = 10;

function formatUsd(usd: number): string {
  if (usd < 0.01) return "< $0.01";
  return `$${usd.toFixed(2)}`;
}

function formatCredits(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function estimateSendCost(messageText: string): { credits: number; usd: number } {
  const inputTokens = Math.ceil(messageText.length / 4) + 3_000;
  const outputTokens = 2_000;
  const inputCost = inputTokens * SONNET_INPUT_USD_PER_TOKEN;
  const outputCost = outputTokens * SONNET_OUTPUT_USD_PER_TOKEN;
  const totalCost = (inputCost + outputCost) * MARKUP;
  const credits = Math.max(Math.ceil(totalCost / USD_PER_CREDIT), 500);
  return { credits, usd: credits * USD_PER_CREDIT };
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-[11px] font-semibold tabular-nums ${accent ? "text-foreground" : "text-foreground/70"}`}>
        {value}
      </span>
    </div>
  );
}

function RequestSummaryCard({ summary }: { summary: RequestSummary }) {
  const [expanded, setExpanded] = useState(true);
  const totalTokens = summary.inputTokens + summary.outputTokens;

  return (
    <div className="animate-fade-in rounded-xl border border-border/50 bg-muted/15 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="w-6 h-6 rounded-md bg-muted/60 border border-border/50 flex items-center justify-center shrink-0">
          <Clock className="w-3 h-3 text-muted-foreground" />
        </div>
        <span className="text-[11px] font-medium text-foreground/80 flex-1">
          Worked for {formatDuration(summary.durationMs)}
        </span>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-border/40 divide-y divide-border/25">
          {totalTokens > 0 && (
            <SummaryRow
              label="Tokens used"
              value={`${summary.inputTokens.toLocaleString()} in · ${summary.outputTokens.toLocaleString()} out`}
            />
          )}
          {summary.filesChanged > 0 && (
            <SummaryRow
              label="Files changed"
              value={summary.filesChanged === 1 ? "1 file" : `${summary.filesChanged} files`}
            />
          )}
          {summary.credits > 0 && (
            <>
              <SummaryRow label="Credits used" value={`${summary.credits.toLocaleString()} credits`} />
              <SummaryRow label="Request cost" value={formatUsd(summary.usd)} accent />
            </>
          )}
        </div>
      )}
    </div>
  );
}

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
  activeFileId?: number | null;
  activeFileName?: string;
}

export function ChatPanel({ projectId, onFileUpdated, activeFileId, activeFileName }: ChatPanelProps) {
  const draftKey = `chat-draft-${projectId}`;
  const surgicalKey = `surgical-mode-${projectId}`;
  const [input, setInput] = useState(() => localStorage.getItem(draftKey) ?? "");
  const [surgicalMode, setSurgicalMode] = useState(() => localStorage.getItem(surgicalKey) !== "off");

  const toggleSurgical = () => {
    setSurgicalMode((prev) => {
      const next = !prev;
      localStorage.setItem(surgicalKey, next ? "on" : "off");
      return next;
    });
  };

  const effectiveFocusFileId = surgicalMode && activeFileId ? activeFileId : undefined;
  const [attachedFile, setAttachedFile] = useState<{
    attachment: MessageAttachment;
    previewUrl?: string;
    fileName: string;
    kind: "image" | "pdf" | "text";
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: messages, isLoading } = useListProjectMessages(projectId);
  const {
    sendMessage, isStreaming, streamingContent, fileUpdateVersion,
    stopStream, error, outOfCredits, clearOutOfCredits,
    isThinking, thinkingContent, thinkingSeconds,
    lastSummary,
  } = useChatStream(projectId);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [thinkingExpanded, setThinkingExpanded] = useState(false);

  const scrollToBottom = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  useEffect(() => { scrollToBottom(); }, [messages, streamingContent, lastSummary]);

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
    sendMessage(text, attachedFile?.attachment, effectiveFocusFileId ?? undefined);
    setInput("");
    localStorage.removeItem(draftKey);
    clearAttachment();
  };

  const displayStreamContent = cleanStreamingForDisplay(streamingContent);
  const codeInfo = isStreaming ? getStreamingCodeInfo(streamingContent) : null;
  const isWritingCode = !!codeInfo;

  // Pre-send estimate shown while typing
  const trimmedInput = input.trim();
  const preSendEstimate = !isStreaming && trimmedInput.length > 0
    ? estimateSendCost(trimmedInput)
    : null;

  return (
    <div className="flex flex-col h-full bg-card/50">
      <div className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-background/50 backdrop-blur-md gap-3">
        <h3 className="font-display font-semibold flex items-center gap-2 flex-1 min-w-0">
          <Bot className="w-5 h-5 text-primary shrink-0" />
          AI Assistant
        </h3>
        <button
          onClick={toggleSurgical}
          title={surgicalMode ? "Surgical mode ON — only editing the focused file. Click to switch to Full mode." : "Full mode — editing all files. Click to switch to Surgical mode."}
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors shrink-0 ${
            surgicalMode
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {surgicalMode ? <Scissors className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
          {surgicalMode ? "Surgical" : "Full"}
        </button>
      </div>

      {/* Surgical mode file indicator */}
      {surgicalMode && activeFileName && (
        <div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-2">
          <Scissors className="w-3 h-3 text-primary shrink-0" />
          <span className="text-xs text-primary font-medium truncate">Targeting: <span className="font-mono">{activeFileName}</span></span>
          <span className="text-xs text-muted-foreground ml-auto shrink-0">other files untouched</span>
        </div>
      )}
      {surgicalMode && !activeFileName && (
        <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/20 flex items-center gap-2">
          <Scissors className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="text-xs text-amber-400">Open a file in the editor to activate surgical targeting</span>
        </div>
      )}

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
                  {(msg as any)._imagePreview && (
                    <img
                      src={(msg as any)._imagePreview}
                      alt="Attached"
                      className="max-w-[180px] max-h-[120px] rounded-xl border border-border/60 object-cover shadow-sm"
                    />
                  )}
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
                  {isThinking
                    ? <Brain className="w-4 h-4 text-violet-400 animate-pulse" />
                    : <Bot className="w-4 h-4 animate-pulse" />
                  }
                </div>
                <div className="max-w-[85%] space-y-2">
                  {isThinking && (
                    <div className="rounded-2xl px-4 py-3 shadow-sm bg-violet-500/10 border border-violet-500/30">
                      <div className="flex items-center gap-2">
                        <Brain className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span className="text-xs text-violet-300 font-medium">Planning…</span>
                        <div className="flex gap-1 ml-1">
                          <div className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {!isThinking && thinkingSeconds > 0 && thinkingContent && (
                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 overflow-hidden">
                      <button
                        onClick={() => setThinkingExpanded((v) => !v)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-violet-500/10 transition-colors"
                      >
                        <Brain className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span className="text-xs text-violet-300 font-medium flex-1">
                          Thought for {thinkingSeconds}s
                        </span>
                        {thinkingExpanded
                          ? <ChevronDown className="w-3 h-3 text-violet-400" />
                          : <ChevronRight className="w-3 h-3 text-violet-400" />
                        }
                      </button>
                      {thinkingExpanded && (
                        <div className="px-3 pb-3 pt-1 text-[11px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {thinkingContent}
                        </div>
                      )}
                    </div>
                  )}

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

                  {!isThinking && !displayStreamContent && !isWritingCode && (
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

            {/* ── Request summary card — appears after streaming ends ── */}
            {!isStreaming && lastSummary && (
              <div className="ml-11">
                <RequestSummaryCard summary={lastSummary} />
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

        {/* Cost bar: shows last-request cost at rest, pre-send estimate while typing */}
        {!isStreaming && (preSendEstimate || lastSummary) && (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] pl-1">
            <Coins className="w-3 h-3 shrink-0 text-muted-foreground/50" />
            {preSendEstimate ? (
              <span className="text-muted-foreground/60">
                Est. ~{formatCredits(preSendEstimate.credits)} credits (~{formatUsd(preSendEstimate.usd)})
              </span>
            ) : lastSummary && lastSummary.credits > 0 ? (
              <span className="text-muted-foreground/70">
                Last request:{" "}
                <span className="font-medium text-foreground/70">{lastSummary.credits.toLocaleString()} credits</span>
                {" · "}
                <span className="font-medium text-foreground/60">{formatUsd(lastSummary.usd)}</span>
              </span>
            ) : null}
          </div>
        )}
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
