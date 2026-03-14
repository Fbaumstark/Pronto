import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, SquareSquare, Paperclip, X, Zap, Clock } from "lucide-react";
import { useListProjectMessages } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListProjectMessagesQueryKey } from "@workspace/api-client-react";
import { useChatStream } from "@/hooks/use-chat-stream";
import ReactMarkdown from "react-markdown";
import { cleanResponseForDisplay, cleanStreamingForDisplay } from "@/lib/clean-response";

async function fileToBase64(file: File): Promise<{ imageData: string; imageMimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ imageData: result.split(",")[1], imageMimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  const [attachedImage, setAttachedImage] = useState<{ imageData: string; imageMimeType: string; previewUrl: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { data: messages, isLoading } = useListProjectMessages(projectId);
  const { sendMessage, isStreaming, streamingContent, fileUpdateVersion, stopStream, error, lastUsage } = useChatStream(projectId);

  // Detect when the AI is still finishing in the background (user left and came back)
  const lastMsg = messages?.[messages.length - 1];
  const isGeneratingInBackground = !isStreaming && !isLoading && !!lastMsg && lastMsg.role === "user";

  // Poll every 2 s until the AI response lands
  useEffect(() => {
    if (!isGeneratingInBackground) return;
    const key = getListProjectMessagesQueryKey(projectId);
    const timer = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: key });
    }, 2000);
    return () => clearInterval(timer);
  }, [isGeneratingInBackground, projectId, queryClient]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  useEffect(() => {
    if (fileUpdateVersion > 0) {
      onFileUpdated?.();
    }
  }, [fileUpdateVersion]);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (val) localStorage.setItem(draftKey, val);
    else localStorage.removeItem(draftKey);
  };

  const clearImage = () => {
    if (attachedImage?.previewUrl) URL.revokeObjectURL(attachedImage.previewUrl);
    setAttachedImage(null);
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5 MB."); return; }
    const { imageData, imageMimeType } = await fileToBase64(file);
    setAttachedImage({ imageData, imageMimeType, previewUrl: URL.createObjectURL(file) });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachedImage) || isStreaming) return;
    const text = input.trim() || "Make changes based on this image.";
    sendMessage(text, attachedImage ? { imageData: attachedImage.imageData, imageMimeType: attachedImage.imageMimeType, previewUrl: attachedImage.previewUrl } : undefined);
    setInput("");
    localStorage.removeItem(draftKey);
    clearImage();
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
                  {/* Attached image thumbnail */}
                  {(msg as any)._imagePreview && (
                    <img
                      src={(msg as any)._imagePreview}
                      alt="Attached"
                      className="max-w-[180px] max-h-[120px] rounded-xl border border-border/60 object-cover shadow-sm"
                    />
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
                  {/* AI explanation text */}
                  {displayStreamContent && (
                    <div className="rounded-2xl px-4 md:px-5 py-3 md:py-4 shadow-sm bg-muted/30 border border-border text-foreground prose prose-invert prose-sm">
                      <ReactMarkdown>{displayStreamContent}</ReactMarkdown>
                    </div>
                  )}

                  {/* Live code writing indicator */}
                  {isWritingCode && (
                    <div className="rounded-2xl overflow-hidden border border-primary/30 bg-black/60 shadow-lg shadow-primary/10">
                      {/* Header bar */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b border-primary/20">
                        <FileCode2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-xs font-mono text-primary font-medium truncate flex-1">{codeInfo!.filename}</span>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{codeInfo!.lines} lines</span>
                        <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
                      </div>
                      {/* Live code lines */}
                      <div className="px-3 py-2.5 space-y-0.5">
                        {codeInfo!.visibleLines.map((line, i) => (
                          <div key={i} className="font-mono text-[10px] text-green-400/80 truncate leading-relaxed">
                            {line}
                          </div>
                        ))}
                        <div className="font-mono text-[10px] text-green-400 flex items-center gap-0.5 leading-relaxed">
                          <span className="inline-block w-1.5 h-3 bg-green-400 animate-pulse rounded-sm" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Initial thinking dots */}
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

            {/* Background generation indicator — user left and came back */}
            {isGeneratingInBackground && (
              <div className="flex gap-3 md:gap-4 animate-fade-in">
                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-muted border border-border text-foreground shadow-sm">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-muted/30 border border-border shadow-sm flex items-center gap-2.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 animate-pulse" />
                  <span className="text-sm text-muted-foreground">Still working on it — checking every few seconds…</span>
                  <Loader2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 animate-spin" />
                </div>
              </div>
            )}

            {/* Usage summary — shown after each completed generation */}
            {!isStreaming && lastUsage && (
              <div className="flex justify-center animate-fade-in">
                <div className="inline-flex items-center gap-2.5 bg-muted/40 border border-border/50 rounded-xl px-3.5 py-2 text-[11px] text-muted-foreground">
                  <Zap className="w-3 h-3 text-primary shrink-0" />
                  <span className="font-medium text-foreground">
                    {lastUsage.unlimited ? "Unlimited" : `${lastUsage.creditsCharged.toLocaleString()} credits`}
                  </span>
                  <span className="text-border">·</span>
                  <span>{(lastUsage.inputTokens / 1000).toFixed(1)}K&thinsp;in&ensp;/&ensp;{(lastUsage.outputTokens / 1000).toFixed(1)}K&thinsp;out</span>
                  {!lastUsage.unlimited && lastUsage.creditsRemaining !== null && (
                    <>
                      <span className="text-border">·</span>
                      <span>{lastUsage.creditsRemaining.toLocaleString()} left</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="mx-auto max-w-sm bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive text-center">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 md:p-4 border-t border-border bg-background/50 backdrop-blur-md shrink-0">
        {/* Attached image preview */}
        {attachedImage && (
          <div className="mb-2 flex items-center gap-2.5">
            <div className="relative inline-flex shrink-0">
              <img
                src={attachedImage.previewUrl}
                alt="Attachment"
                className="h-14 w-auto max-w-[100px] rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow w-5 h-5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">Image attached — Claude will see this with your message</p>
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
            placeholder={isGeneratingInBackground ? "Waiting for AI to finish…" : attachedImage ? "Describe what to change (or just hit send)…" : "Type a message to build your app..."}
            disabled={isGeneratingInBackground}
            className="w-full bg-muted/50 border border-border rounded-xl pl-11 pr-14 py-3 min-h-[60px] max-h-[160px] resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-muted-foreground/70 transition-all duration-200 shadow-inner disabled:opacity-50"
          />

          {/* Paperclip / attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            title="Attach an image"
            className={`absolute left-3 bottom-3 p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
              attachedImage ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImagePick}
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
              disabled={(!input.trim() && !attachedImage) || isStreaming}
              className="absolute right-3 bottom-3 p-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
