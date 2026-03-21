import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getListProjectMessagesQueryKey } from '@workspace/api-client-react';
import { api } from '@/lib/api-base';

export type MessageAttachment =
  | { type: 'image'; imageData: string; imageMimeType: string; previewUrl?: string }
  | { type: 'pdf';   imageData: string; fileName: string }
  | { type: 'text';  fileContent: string; fileName: string };

export interface RequestSummary {
  credits: number;
  usd: number;
  inputTokens: number;
  outputTokens: number;
  filesChanged: number;
  durationMs: number;
  model: string;
}

// $25 / 1,250,000 credits = $0.00002 per credit
const USD_PER_CREDIT = 25 / 1_250_000;

const SUMMARY_KEY = (projectId: number) => `pronto-last-summary-${projectId}`;

function readStoredSummary(projectId: number): RequestSummary | null {
  try {
    const raw = localStorage.getItem(SUMMARY_KEY(projectId));
    return raw ? (JSON.parse(raw) as RequestSummary) : null;
  } catch {
    return null;
  }
}

export function useChatStream(projectId: number) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [fileUpdateVersion, setFileUpdateVersion] = useState(0);
  const [wasInterrupted, setWasInterrupted] = useState(false);

  // Persisted summary for the last completed request
  const [lastSummary, setLastSummaryState] = useState<RequestSummary | null>(
    () => readStoredSummary(projectId)
  );

  const setLastSummary = (s: RequestSummary | null) => {
    setLastSummaryState(s);
    if (s) {
      try { localStorage.setItem(SUMMARY_KEY(projectId), JSON.stringify(s)); } catch {}
    } else {
      try { localStorage.removeItem(SUMMARY_KEY(projectId)); } catch {}
    }
  };

  // Extended thinking state
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingContent, setThinkingContent] = useState('');
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const thinkingStartRef = useRef<number>(0);
  const isThinkingRef = useRef(false);

  // Balance tracking — fetch once on mount, then update from `done` events
  const balanceRef = useRef<number | null>(null);
  const isUnlimitedRef = useRef(false);

  useEffect(() => {
    api('/api/credits')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        isUnlimitedRef.current = d.unlimited ?? false;
        if (typeof d.balance === 'number') balanceRef.current = d.balance;
      })
      .catch(() => {});
  }, []);

  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const receivedDoneRef = useRef(false);

  const stopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const resumeGeneration = () => {
    sendMessage('Please continue from where you left off — complete any unfinished parts.');
  };

  const sendMessage = async (content: string, attachment?: MessageAttachment, focusFileId?: number) => {
    setIsStreaming(true);
    setStreamingContent('');
    setError(null);
    setOutOfCredits(false);
    setWasInterrupted(false);
    setIsThinking(false);
    setThinkingContent('');
    setThinkingSeconds(0);
    setLastSummary(null);
    isThinkingRef.current = false;
    receivedDoneRef.current = false;

    abortControllerRef.current = new AbortController();

    const messagesKey = getListProjectMessagesQueryKey(projectId);
    queryClient.setQueryData(messagesKey, (old: any = []) => [
      ...old,
      {
        id: Math.random(),
        projectId,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        _imagePreview: attachment?.type === 'image' ? attachment.previewUrl : undefined,
        _fileName: attachment && attachment.type !== 'image' ? attachment.fileName : undefined,
      },
    ]);

    // Build request body
    const bodyObj: Record<string, any> = { content, ...(focusFileId ? { focusFileId } : {}) };
    if (attachment?.type === 'image') {
      bodyObj.imageData = attachment.imageData;
      bodyObj.imageMimeType = attachment.imageMimeType;
    } else if (attachment?.type === 'pdf') {
      bodyObj.imageData = attachment.imageData;
      bodyObj.imageMimeType = 'application/pdf';
      bodyObj.fileName = attachment.fileName;
    } else if (attachment?.type === 'text') {
      bodyObj.fileContent = attachment.fileContent;
      bodyObj.fileName = attachment.fileName;
    }

    // Serialize then wipe large base64 from memory
    const requestBody = JSON.stringify(bodyObj);
    if (attachment?.type === 'image' || attachment?.type === 'pdf') {
      (attachment as any).imageData = null;
    }
    if (attachment?.type === 'text') {
      (attachment as any).fileContent = null;
    }

    try {
      const res = await api(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok || !res.body) {
        if (res.status === 402) {
          setOutOfCredits(true);
          setIsStreaming(false);
          return;
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as any).error || 'Stream request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (data.type === 'thinking_start') {
              setIsThinking(true);
              isThinkingRef.current = true;
              thinkingStartRef.current = Date.now();
              setThinkingContent('');
            }

            if (data.type === 'thinking_delta') {
              setThinkingContent((prev) => prev + (data.content || ''));
            }

            if (data.type === 'text') {
              if (isThinkingRef.current) {
                isThinkingRef.current = false;
                setIsThinking(false);
                setThinkingSeconds(Math.round((Date.now() - thinkingStartRef.current) / 1000));
              }
              setStreamingContent((prev) => prev + (data.content || ''));
            }

            if (data.type === 'file_update') {
              setFileUpdateVersion((v) => v + 1);
            }

            if (data.type === 'error') {
              setError(data.error || 'An error occurred');
            }

            if (data.type === 'done') {
              receivedDoneRef.current = true;
              const newBalance: number | null = data.creditsRemaining ?? null;
              const unlimited: boolean = data.unlimited ?? false;
              isUnlimitedRef.current = unlimited;

              // Build the summary from what the server sent back
              const creditsUsed: number = data.creditsUsed ?? (
                !unlimited && typeof newBalance === 'number' && balanceRef.current !== null
                  ? Math.max(0, balanceRef.current - newBalance)
                  : 0
              );

              if (creditsUsed > 0 || data.inputTokens) {
                setLastSummary({
                  credits: creditsUsed,
                  usd: creditsUsed * USD_PER_CREDIT,
                  inputTokens: data.inputTokens ?? 0,
                  outputTokens: data.outputTokens ?? 0,
                  filesChanged: data.filesChanged ?? 0,
                  durationMs: data.durationMs ?? 0,
                  model: data.model ?? '',
                });
              }

              if (typeof newBalance === 'number') {
                balanceRef.current = newBalance;
              }
            }
          } catch {
            // ignore malformed SSE
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const msg = err.message || '';
        if (msg === 'Load failed' || msg === 'Failed to fetch' || msg.includes('network')) {
          setError('Connection dropped — your network may have cut out. Please try again.');
          setWasInterrupted(true);
        } else {
          setError(msg || 'Something went wrong. Please try again.');
          setWasInterrupted(true);
        }
      }
    } finally {
      // If the stream closed without a `done` event and wasn't user-aborted,
      // the server was likely killed mid-generation (e.g. Autoscale cycle).
      if (!receivedDoneRef.current && abortControllerRef.current !== null) {
        setWasInterrupted(true);
        setError('Generation was interrupted — the server restarted mid-response.');
      }
      setIsStreaming(false);
      setIsThinking(false);
      isThinkingRef.current = false;
      setStreamingContent('');
      queryClient.invalidateQueries({ queryKey: getListProjectMessagesQueryKey(projectId) });
    }
  };

  return {
    sendMessage,
    isStreaming,
    streamingContent,
    fileUpdateVersion,
    error,
    outOfCredits,
    clearOutOfCredits: () => setOutOfCredits(false),
    stopStream,
    isThinking,
    thinkingContent,
    thinkingSeconds,
    lastSummary,
    wasInterrupted,
    resumeGeneration,
  };
}
