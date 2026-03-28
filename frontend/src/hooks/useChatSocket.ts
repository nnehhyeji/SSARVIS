import { useCallback, useRef } from 'react';

import { getApiOrigin } from '../config/api';

interface UseChatSocketOptions<TMessage = unknown> {
  tokenQueryKey?: string;
  path?: string;
  getToken?: () => string | null;
  connectTimeoutMs?: number;
  onOpen?: () => void;
  onClose?: (context: { hadToken: boolean }) => void;
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

  const connectSocket = useCallback(() => {
    const token = getToken();
    if (!token) {
      console.log('[useChatSocket] connectSocket skipped: no token');
      onConnectionUnavailable?.(false);
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
      onOpen?.();
    };

    socket.onclose = () => {
      console.log('[useChatSocket] socket close');
      onClose?.({ hadToken: !!getToken() });
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
    };

    socket.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        onBinaryChunk?.(event.data);
        return;
      }

      if (event.data instanceof Blob) {
        const buffer = await event.data.arrayBuffer();
        onBinaryChunk?.(buffer);
        return;
      }

      if (typeof event.data !== 'string') return;
      const parsed = JSON.parse(event.data) as TMessage;
      await onMessage?.(parsed);
    };

    wsRef.current = socket;
    return socket;
  }, [
    getToken,
    onBinaryChunk,
    onClose,
    onConnectionUnavailable,
    onMessage,
    onOpen,
    path,
    tokenQueryKey,
  ]);

  const ensureSocketReady = useCallback(async () => {
    const socket = connectSocket();
    console.log('[useChatSocket] ensureSocketReady start', socket?.readyState ?? 'null');
    if (!socket) return false;

    if (socket.readyState === WebSocket.OPEN) {
      console.log('[useChatSocket] ensureSocketReady already open');
      return true;
    }

    if (socket.readyState !== WebSocket.CONNECTING) {
      console.log('[useChatSocket] ensureSocketReady failed: invalid state', socket.readyState);
      onConnectionUnavailable?.(!!getToken());
      return false;
    }

    return await new Promise<boolean>((resolve) => {
      let resolved = false;

      const cleanup = (result: boolean) => {
        if (resolved) return;
        resolved = true;
        socket.removeEventListener('open', handleOpen);
        socket.removeEventListener('error', handleError);
        socket.removeEventListener('close', handleClose);
        clearTimeout(timeoutId);
        if (!result) {
          console.log('[useChatSocket] ensureSocketReady failed while waiting');
          onConnectionUnavailable?.(!!getToken());
        } else {
          console.log('[useChatSocket] ensureSocketReady success');
        }
        resolve(result);
      };

      const handleOpen = () => cleanup(true);
      const handleError = () => cleanup(false);
      const handleClose = () => cleanup(false);
      const timeoutId = setTimeout(() => cleanup(false), connectTimeoutMs);

      socket.addEventListener('open', handleOpen);
      socket.addEventListener('error', handleError);
      socket.addEventListener('close', handleClose);
    });
  }, [connectSocket, connectTimeoutMs, getToken, onConnectionUnavailable]);

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
