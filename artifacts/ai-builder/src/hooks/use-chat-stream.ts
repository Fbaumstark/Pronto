import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getListProjectMessagesQueryKey } from '@workspace/api-client-react';

export function useChatStream(projectId: number) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fileUpdateVersion, setFileUpdateVersion] = useState(0);
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const sendMessage = async (content: string) => {
    setIsStreaming(true);
    setStreamingContent('');
    setError(null);

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
      },
    ]);

    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok || !res.body) {
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

            if (data.type === 'text') {
              setStreamingContent((prev) => prev + (data.content || ''));
            }

            if (data.type === 'file_update') {
              setFileUpdateVersion((v) => v + 1);
            }

            if (data.type === 'error') {
              setError(data.error || 'An error occurred');
            }
          } catch {
            // ignore malformed SSE
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Stream failed');
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      queryClient.invalidateQueries({ queryKey: getListProjectMessagesQueryKey(projectId) });
    }
  };

  return { sendMessage, isStreaming, streamingContent, fileUpdateVersion, error, stopStream };
}
