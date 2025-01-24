import { DiscordMessage } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Progress } from '../common/Progress';

interface ReportGeneratorProps {
  channelId: string;
  channelName: string;
  timeframe: string;
  onComplete?: (messages: DiscordMessage[]) => void;
  onError?: (error: string) => void;
}

interface StreamUpdate {
  type: 'init' | 'progress' | 'batch' | 'complete' | 'error';
  stage?: 'setup' | 'fetching' | 'processing';
  batchCount?: number;
  batchSize?: number;
  progress?: number;
  messages?: DiscordMessage[];
  totalMessages?: number;
  error?: string;
}

export function ReportGenerator({ 
  channelId, 
  channelName,
  timeframe,
  onComplete,
  onError 
}: ReportGeneratorProps) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'setup' | 'fetching' | 'processing'>();
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const startTime = useRef(Date.now());
  const lastUpdateTime = useRef(Date.now());
  const fetchAttempts = useRef(0);

  // Performance logging helper with debug info
  const logPerformance = useCallback((event: string, data?: any) => {
    const now = Date.now();
    const totalTime = now - startTime.current;
    const timeSinceLastUpdate = now - lastUpdateTime.current;
    lastUpdateTime.current = now;

    console.log(`[${new Date().toISOString()}] ${event}`, {
      totalTimeMs: totalTime,
      timeSinceLastUpdateMs: timeSinceLastUpdate,
      stage: stage,
      progress: progress,
      status: status,
      hasError: !!error,
      messageCount: messages.length,
      ...data
    });
  }, [stage, progress, status, error, messages.length]);

  // Validate required props
  useEffect(() => {
    startTime.current = Date.now();
    lastUpdateTime.current = Date.now();
    fetchAttempts.current = 0;
    
    logPerformance('ReportGenerator mounted', {
      channelId,
      channelName,
      timeframe
    });

    if (!channelId || !channelName) {
      const errorMsg = 'Missing required channel information';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setStatus('Ready to fetch messages...');
  }, [channelId, channelName, timeframe, onError, logPerformance]);

  const handleUpdate = useCallback((update: StreamUpdate) => {
    logPerformance('Received update', { 
      updateType: update.type,
      updateStage: update.stage,
      updateProgress: update.progress,
      messageCount: update.messages?.length
    });

    switch (update.type) {
      case 'init':
        setStage(update.stage);
        setProgress(0);
        setStatus('Starting message fetch...');
        break;

      case 'batch':
        setStage(update.stage);
        if (update.progress) setProgress(update.progress);
        const newMessages = update.messages || [];
        setMessages(prev => [...prev, ...newMessages]);
        logPerformance('Processed batch', {
          batchSize: newMessages.length,
          totalMessages: update.totalMessages,
          batchCount: update.batchCount
        });
        setStatus(
          `Processing batch ${update.batchCount} - ${update.totalMessages} messages`
        );
        break;

      case 'complete':
        setProgress(100);
        logPerformance('Processing complete', {
          totalMessages: update.totalMessages,
          batchCount: update.batchCount,
          totalTimeSeconds: (Date.now() - startTime.current) / 1000
        });
        setStatus(
          `Complete - ${update.totalMessages} messages in ${update.batchCount} batches`
        );
        setStage('processing');
        onComplete?.(messages);
        break;

      case 'error':
        logPerformance('Error occurred', { error: update.error });
        setError(update.error || 'Unknown error');
        setStatus('Error occurred');
        onError?.(update.error || 'Unknown error');
        break;
    }
  }, [messages, onComplete, onError, logPerformance]);

  useEffect(() => {
    const abortController = new AbortController();
    
    async function fetchMessages() {
      try {
        fetchAttempts.current += 1;
        setStage('fetching');
        setStatus('Connecting to server...');
        
        logPerformance('Starting fetch', {
          channelId,
          channelName,
          timeframe,
          attempt: fetchAttempts.current
        });

        const url = `/api/discord/messages?channelId=${channelId}&channelName=${encodeURIComponent(channelName)}&timeframe=${timeframe}`;
        logPerformance('Fetching URL', { url });

        const response = await fetch(url, { 
          signal: abortController.signal,
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache'
          }
        });

        logPerformance('Response received', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
        }
        
        if (!response.body) {
          throw new Error('No response body received from server');
        }

        setStatus('Connected, reading stream...');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let chunkCount = 0;

        logPerformance('Starting stream reading');

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            logPerformance('Stream complete', { 
              totalChunks: chunkCount,
              finalBufferSize: buffer.length 
            });
            break;
          }

          chunkCount++;
          const chunk = decoder.decode(value, { stream: true });
          logPerformance('Chunk received', { 
            chunkNumber: chunkCount,
            chunkSize: chunk.length,
            chunkContent: chunk.length > 100 ? chunk.substring(0, 100) + '...' : chunk
          });

          buffer += chunk;
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const update = JSON.parse(line.slice(6)) as StreamUpdate;
                handleUpdate(update);
              } catch (parseError) {
                logPerformance('Failed to parse update', { 
                  line,
                  error: parseError instanceof Error ? parseError.message : 'Unknown parse error'
                });
              }
            }
          }
        }

      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            logPerformance('Fetch aborted');
            return;
          }
          logPerformance('Error occurred', { 
            error: err.message,
            stack: err.stack
          });
          setError(err.message);
          setStatus('Error: ' + err.message);
          onError?.(err.message);
        } else {
          const error = 'An unknown error occurred';
          logPerformance('Unknown error', { error });
          setError(error);
          setStatus('Unknown error occurred');
          onError?.(error);
        }
      }
    }

    fetchMessages();
    return () => {
      logPerformance('Cleanup - aborting fetch');
      abortController.abort();
    };
  }, [channelId, channelName, timeframe, handleUpdate, onError, logPerformance]);

  return (
    <div className="space-y-4">
      <Progress
        value={progress}
        stage={stage}
        status={status}
        error={error}
        className="w-full"
      />
      {/* Add detailed debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs font-mono space-y-1 text-gray-500">
          <div>Time elapsed: {((Date.now() - startTime.current) / 1000).toFixed(1)}s</div>
          <div>Stage: {stage || 'none'}</div>
          <div>Status: {status}</div>
          {error && <div className="text-red-500">Error: {error}</div>}
          <div>Messages: {messages.length}</div>
          <div>Progress: {progress}%</div>
        </div>
      )}
    </div>
  );
} 