import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, SquareSquare } from "lucide-react";
import { useListProjectMessages } from "@workspace/api-client-react";
import { useChatStream } from "@/hooks/use-chat-stream";
import ReactMarkdown from "react-markdown";

export function ChatPanel({ projectId }: { projectId: number }) {
  const draftKey = `chat-draft-${projectId}`;
  const [input, setInput] = useState(() => localStorage.getItem(draftKey) ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: messages, isLoading } = useListProjectMessages(projectId);
  const { sendMessage, isStreaming, streamingContent, stopStream } = useChatStream(projectId);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (val) {
      localStorage.setItem(draftKey, val);
    } else {
      localStorage.removeItem(draftKey);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
    localStorage.removeItem(draftKey);
  };

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
                <div className={`max-w-[85%] rounded-2xl px-4 md:px-5 py-3 md:py-4 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-primary/10 border border-primary/20 text-foreground'
                    : 'bg-muted/30 border border-border text-foreground prose prose-invert prose-sm max-w-none'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}

            {isStreaming && (
              <div className="flex gap-3 md:gap-4 animate-fade-in">
                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-muted border border-border text-foreground shadow-sm">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="max-w-[85%] rounded-2xl px-4 md:px-5 py-3 md:py-4 shadow-sm bg-muted/30 border border-border text-foreground prose prose-invert prose-sm">
                  {streamingContent ? (
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  ) : (
                    <div className="flex gap-1.5 items-center h-5">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 md:p-4 border-t border-border bg-background/50 backdrop-blur-md shrink-0">
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
            placeholder="Type a message to build your app..."
            className="w-full bg-muted/50 border border-border rounded-xl pl-4 pr-14 py-3 min-h-[60px] max-h-[160px] resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-muted-foreground/70 transition-all duration-200 shadow-inner"
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
              disabled={!input.trim() || isStreaming}
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
