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
  agentBreakdown?: Array<{ agent: string; model: string; credits: number }>;
  swarm?: boolean;
}

export interface AgentInfo {
  agentId: string;
  agentType: string;
  role: string;
  status: 'spawned' | 'running' | 'completed';
  message?: string;
  filesChanged?: string[];
}

export interface SwarmProgress {
  phase: string;
  activeAgents: number;
  completedTasks: number;
  totalTasks: number;
}

export interface FileDiff {
  filename: string;
  before: string;
  after: string;
}

export interface UndoFile {
  id: number;
  filename: string;
  content: string;
}

export interface SelectedElement {
  selector: string;
  tag: string;
  text?: string;
}

export interface SendOptions {
  /** Single attachment (PDF, text, or single image) */
  attachment?: MessageAttachment;
  /** Multiple images — takes precedence over attachment when provided */
  attachments?: MessageAttachment[];
  focusFileId?: number;
  /** Snapshot of current file contents for undo/diff (pass before sending) */
  undoData?: UndoFile[];
  /** Element the user selected in the preview inspector */
  selectedElement?: SelectedElement;
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

  // Undo / diff state
  const [fileDiffs, setFileDiffs] = useState<FileDiff[] | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const undoDataRef = useRef<UndoFile[]>([]);
  const pendingDiffsRef = useRef<FileDiff[]>([]);

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

  // Swarm agent tracking
  const [activeAgents, setActiveAgents] = useState<AgentInfo[]>([]);
  const [swarmProgress, setSwarmProgress] = useState<SwarmProgress | null>(null);

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

  /** Undo the last Claude change by restoring pre-request file contents. */
  const undo = async () => {
    if (!canUndo || undoDataRef.current.length === 0) return;
    try {
      await api(`/api/projects/${projectId}/restore-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: undoDataRef.current.map(f => ({ id: f.id, content: f.content })) }),
      });
      setCanUndo(false);
      setFileDiffs(null);
      setFileUpdateVersion((v) => v + 1);
      queryClient.invalidateQueries({ queryKey: getListProjectMessagesQueryKey(projectId) });
    } catch (err) {
      console.error('Undo failed:', err);
    }
  };

  const sendMessage = async (content: string, optionsOrAttachment?: SendOptions | MessageAttachment, legacyFocusFileId?: number) => {
    // Support legacy positional call: sendMessage(content, attachment, focusFileId)
    let options: SendOptions = {};
    if (optionsOrAttachment && 'type' in optionsOrAttachment) {
      options = { attachment: optionsOrAttachment as MessageAttachment, focusFileId: legacyFocusFileId };
    } else if (optionsOrAttachment) {
      options = optionsOrAttachment as SendOptions;
    }

    const { attachment, attachments, focusFileId, undoData, selectedElement } = options;

    setIsStreaming(true);
    setStreamingContent('');
    setError(null);
    setOutOfCredits(false);
    setWasInterrupted(false);
    setIsThinking(false);
    setThinkingContent('');
    setThinkingSeconds(0);
    setLastSummary(null);
    setActiveAgents([]);
    setSwarmProgress(null);
    setFileDiffs(null);
    setCanUndo(false);
    isThinkingRef.current = false;
    receivedDoneRef.current = false;
    pendingDiffsRef.current = [];

    // Store undo snapshot
    undoDataRef.current = undoData ?? [];

    abortControllerRef.current = new AbortController();

    const messagesKey = getListProjectMessagesQueryKey(projectId);
    const imagePreviews = attachments
      ?.filter((a): a is Extract<MessageAttachment, { type: 'image' }> => a.type === 'image')
      .map(a => a.previewUrl)
      .filter(Boolean) ?? [];

    queryClient.setQueryData(messagesKey, (old: any = []) => [
      ...old,
      {
        id: Math.random(),
        projectId,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        _imagePreview: attachment?.type === 'image' ? attachment.previewUrl : (imagePreviews[0] ?? undefined),
        _imagePreviews: imagePreviews.length > 1 ? imagePreviews : undefined,
        _fileName: attachment && attachment.type !== 'image' ? (attachment as any).fileName : undefined,
        _elementSelector: selectedElement?.selector,
      },
    ]);

    // Build request body
    const bodyObj: Record<string, any> = {
      content,
      ...(focusFileId ? { focusFileId } : {}),
      ...(selectedElement ? { selectedElement } : {}),
    };

    if (attachments && attachments.length > 0) {
      // Multi-image path
      const imageAttachments = attachments.filter(
        (a): a is Extract<MessageAttachment, { type: 'image' }> => a.type === 'image'
      );
      if (imageAttachments.length > 0) {
        bodyObj.images = imageAttachments.map((a) => ({ data: a.imageData, mimeType: a.imageMimeType }));
      }
    } else if (attachment?.type === 'image') {
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

    // Serialize then wipe large base64 from memory (ephemeral)
    const requestBody = JSON.stringify(bodyObj);
    if (attachment?.type === 'image' || attachment?.type === 'pdf') {
      (attachment as any).imageData = null;
    }
    if (attachment?.type === 'text') {
      (attachment as any).fileContent = null;
    }
    if (attachments) {
      for (const a of attachments) {
        if (a.type === 'image') (a as any).imageData = null;
      }
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
              // Track diff: compare new content with pre-request snapshot
              const oldFile = undoDataRef.current.find(f => f.filename === data.filename);
              if (oldFile && data.content !== undefined) {
                const existing = pendingDiffsRef.current.find(d => d.filename === data.filename);
                if (existing) {
                  existing.after = data.content; // update if same file changed twice
                } else {
                  pendingDiffsRef.current.push({
                    filename: data.filename,
                    before: oldFile.content,
                    after: data.content,
                  });
                }
              }
              setFileUpdateVersion((v) => v + 1);
            }

            // Swarm agent events
            if (data.type === 'agent_spawned') {
              setActiveAgents((prev) => [...prev, {
                agentId: data.agentId,
                agentType: data.agentType,
                role: data.role,
                status: 'spawned',
              }]);
            }

            if (data.type === 'agent_progress') {
              setActiveAgents((prev) => prev.map((a) =>
                a.agentId === data.agentId ? { ...a, status: 'running', message: data.message } : a
              ));
            }

            if (data.type === 'agent_completed') {
              setActiveAgents((prev) => prev.map((a) =>
                a.agentId === data.agentId ? { ...a, status: 'completed', filesChanged: data.filesChanged } : a
              ));
              setFileUpdateVersion((v) => v + 1);
            }

            if (data.type === 'swarm_status') {
              setSwarmProgress({
                phase: data.phase,
                activeAgents: data.activeAgents,
                completedTasks: data.completedTasks,
                totalTasks: data.totalTasks,
              });
            }

            if (data.type === 'error') {
              setError(data.error || 'An error occurred');
            }

            if (data.type === 'done') {
              receivedDoneRef.current = true;
              const newBalance: number | null = data.creditsRemaining ?? null;
              const unlimited: boolean = data.unlimited ?? false;
              isUnlimitedRef.current = unlimited;

              const creditsUsed: number = data.creditsUsed ?? (
                !unlimited && typeof newBalance === 'number' && balanceRef.current !== null
                  ? Math.max(0, balanceRef.current - newBalance)
                  : 0
              );

              if (creditsUsed > 0 || data.inputTokens || data.swarm) {
                setLastSummary({
                  credits: creditsUsed,
                  usd: creditsUsed * USD_PER_CREDIT,
                  inputTokens: data.inputTokens ?? 0,
                  outputTokens: data.outputTokens ?? 0,
                  filesChanged: data.filesChanged ?? 0,
                  durationMs: data.durationMs ?? 0,
                  model: data.model ?? '',
                  agentBreakdown: data.agentBreakdown,
                  swarm: data.swarm ?? false,
                });
              }

              if (typeof newBalance === 'number') {
                balanceRef.current = newBalance;
              }

              // Finalize undo/diff
              if (pendingDiffsRef.current.length > 0 && undoDataRef.current.length > 0) {
                setFileDiffs([...pendingDiffsRef.current]);
                setCanUndo(true);
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
    activeAgents,
    swarmProgress,
    fileDiffs,
    canUndo,
    undo,
  };
}
