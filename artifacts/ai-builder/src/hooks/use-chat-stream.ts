import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  getListProjectFilesQueryKey, 
  getListProjectMessagesQueryKey,
  type ProjectFile
} from '@workspace/api-client-react';

export function useChatStream(projectId: number) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
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

    // Optimistically add the user's message to the cache
    const messagesKey = getListProjectMessagesQueryKey(projectId);
    queryClient.setQueryData(messagesKey, (old: any = []) => [
      ...old,
      {
        id: Math.random(), // Temporary ID
        projectId,
        role: 'user',
        content,
        createdAt: new Date().toISOString()
      }
    ]);

    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok || !res.body) {
        throw new Error('Stream request failed');
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
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);
              
              if (data.type === 'text' || data.content) {
                // Sometimes SSE sends content directly or via type: text
                setStreamingContent(prev => prev + (data.content || ''));
              } 
              
              if (data.type === 'file_update') {
                // Update file cache in real-time
                queryClient.setQueryData(
                  getListProjectFilesQueryKey(projectId),
                  (oldFiles: ProjectFile[] = []) => {
                    const exists = oldFiles.find(f => f.filename === data.filename);
                    if (exists) {
                      return oldFiles.map(f => 
                        f.filename === data.filename 
                          ? { ...f, content: data.content, language: data.language || f.language, updatedAt: new Date().toISOString() } 
                          : f
                      );
                    } else {
                      return [...oldFiles, { 
                        id: Math.random(), // Temp ID
                        projectId, 
                        filename: data.filename, 
                        content: data.content, 
                        language: data.language || 'html', 
                        createdAt: new Date().toISOString(), 
                        updatedAt: new Date().toISOString() 
                      }];
                    }
                  }
                );
              }
              
              if (data.type === 'done' || data.done) {
                break;
              }
            } catch (e) {
              console.error("Failed to parse SSE line:", dataStr, e);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Stream failed');
      }
    } finally {
      setIsStreaming(false);
      // Invalidate both files and messages to fetch the persisted database states
      queryClient.invalidateQueries({ queryKey: getListProjectMessagesQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: getListProjectFilesQueryKey(projectId) });
    }
  };

  return { sendMessage, isStreaming, streamingContent, error, stopStream };
}
