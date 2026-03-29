import { useCallback, useEffect, useRef } from 'react';

import { getApiOrigin } from '../config/api';

interface UseChatSocketOptions<TMessage = unknown> {
  tokenQueryKey?: string;
  path?: string;
  getToken?: () => string | null;
  connectTimeoutMs?: number;
  onOpen?: () => void;
  onClose?: (context: {
    hadToken: boolean;
    code: number;
    reason: string;
    wasClean: boolean;
  }) => void;
  onMessage?: (message: TMessage) => void | Promise<void>;
  onBinaryChunk?: (chunk: ArrayBuffer) => void;
  onConnectionUnavailable?: (hasToken: boolean) => void;
}

export function useChatSocket<TMessage = unknown>({
  tokenQueryKey = 'token',
  path = '/ws/chat',
  getToken = () => localStorage.getItem('token'),
  connectTimeoutMs = 3000,
  onOpen,
  onClose,
  onMessage,
  onBinaryChunk,
  onConnectionUnavailable,
}: UseChatSocketOptions<TMessage>) {
  const wsRef = useRef<WebSocket | null>(null);
  const messageQueueRef = useRef<Promise<void>>(Promise.resolve());
  const getTokenRef = useRef(getToken);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onMessageRef = useRef(onMessage);
  const onBinaryChunkRef = useRef(onBinaryChunk);
  const onConnectionUnavailableRef = useRef(onConnectionUnavailable);

  useEffect(() => {
    getTokenRef.current = getToken;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onMessageRef.current = onMessage;
    onBinaryChunkRef.current = onBinaryChunk;
    onConnectionUnavailableRef.current = onConnectionUnavailable;
  }, [getToken, onBinaryChunk, onClose, onConnectionUnavailable, onMessage, onOpen]);

  const connectSocket = useCallback(() => {
    const token = getTokenRef.current();
    if (!token) {
      console.log('[useChatSocket] connectSocket skipped: no token');
      onConnectionUnavailableRef.current?.(false);
      return null;
    }

    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      console.log('[useChatSocket] reusing socket', wsRef.current.readyState);
      return wsRef.current;
    }

    const apiOrigin = getApiOrigin();
    const protocol = apiOrigin.startsWith('https://') ? 'wss:' : 'ws:';
    const host = apiOrigin.replace(/^https?:\/\//, '');
    const socket = new WebSocket(
      `${protocol}//${host}${path}?${tokenQueryKey}=${encodeURIComponent(token)}`,
    );
    console.log('[useChatSocket] creating socket', { path, host });
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
      console.log('[useChatSocket] socket open');
      onOpenRef.current?.();
    };

    socket.onclose = (event) => {
      console.log('[useChatSocket] socket close');
      onCloseRef.current?.({
        hadToken: !!getTokenRef.current(),
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
    };

    socket.onmessage = (event) => {
      messageQueueRef.current = messageQueueRef.current
        .catch(() => {
          // keep queue alive even if a previous handler failed
        })
        .then(async () => {
          if (event.data instanceof ArrayBuffer) {
            onBinaryChunkRef.current?.(event.data);
            return;
          }

          if (event.data instanceof Blob) {
            const buffer = await event.data.arrayBuffer();
            onBinaryChunkRef.current?.(buffer);
            return;
          }

          if (typeof event.data !== 'string') return;
          const parsed = JSON.parse(event.data) as TMessage;
          await onMessageRef.current?.(parsed);
        });
    };

    wsRef.current = socket;
    return socket;
  }, [path, tokenQueryKey]);

  const ensureSocketReady = useCallback(async () => {
    const socket = connectSocket();
    const currentState = socket?.readyState ?? WebSocket.CLOSED;
    console.log('[useChatSocket] ensureSocketReady start', { currentState });

    if (!socket) return false;

    if (socket.readyState === WebSocket.OPEN) {
      console.log('[useChatSocket] ensureSocketReady already OPEN');
      return true;
    }

    if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
      console.log('[useChatSocket] ensureSocketReady failed: socket is CLOSED/CLOSING');
      onConnectionUnavailableRef.current?.(!!getTokenRef.current());
      return false;
    }

    console.log('[useChatSocket] ensureSocketReady waiting for CONNECTING socket...');
    return await new Promise<boolean>((resolve) => {
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          console.log('[useChatSocket] ensureSocketReady TIMEOUT');
          cleanup(false);
        }
      }, connectTimeoutMs);

      const cleanup = (result: boolean) => {
        if (resolved) return;
        resolved = true;
        socket.removeEventListener('open', handleOpen);
        socket.removeEventListener('error', handleError);
        socket.removeEventListener('close', handleClose);
        clearTimeout(timeoutId);

        console.log('[useChatSocket] ensureSocketReady result:', result);
        if (!result) onConnectionUnavailableRef.current?.(!!getTokenRef.current());
        resolve(result);
      };

      const handleOpen = () => {
        console.log('[useChatSocket] ensureSocketReady handleOpen');
        cleanup(true);
      };
      const handleError = (e: Event) => {
        console.log('[useChatSocket] ensureSocketReady handleError', e);
        cleanup(false);
      };
      const handleClose = () => {
        console.log('[useChatSocket] ensureSocketReady handleClose');
        cleanup(false);
      };

      socket.addEventListener('open', handleOpen);
      socket.addEventListener('error', handleError);
      socket.addEventListener('close', handleClose);
    });
  }, [connectSocket, connectTimeoutMs]);

  const closeSocket = useCallback((force = false) => {
    const socket = wsRef.current;
    if (!socket) return;

    if (!force && socket.readyState === WebSocket.CONNECTING) {
      console.log('[useChatSocket] closeSocket skipped: connecting');
      return;
    }

    console.log('[useChatSocket] closeSocket', { force, readyState: socket.readyState });
    socket.close();
  }, []);

  return {
    wsRef,
    connectSocket,
    ensureSocketReady,
    closeSocket,
  };
}
