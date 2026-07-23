'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';

interface SocketContextValue {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextValue>({ socket: null });
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? '';
const SKIP_PREFLIGHT = !SOCKET_URL || SOCKET_URL === 'http://localhost:3000' || SOCKET_URL === '/';

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const role = (session?.user as any)?.role as string | undefined;
  const userId = (session?.user as any)?.id as string | undefined;

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;

    const namespace = role === 'hrd' || role === 'admin' ? 'hrd' : 'user';
    if (namespace === 'user' && !userId) return;

    let active = true;
    let currentSocket: Socket | null = null;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1_200);

    async function connect() {
      if (SKIP_PREFLIGHT) {
        // Tidak ada URL socket eksternal; langsung buka socket.
      } else {
        try {
          const response = await fetch(`${SOCKET_URL}/api/health`, {
            signal: controller.signal,
          });
          if (!response.ok || !active) return;
        } catch {
          return;
        } finally {
          window.clearTimeout(timeout);
        }
      }

      if (!active) return;

      currentSocket = io(`${SOCKET_URL}/${namespace}`, {
        transports: ['websocket', 'polling'],
        query: namespace === 'user' ? { userId } : undefined,
        reconnectionAttempts: 4,
        reconnectionDelay: 2_000,
        reconnectionDelayMax: 10_000,
        timeout: 5_000,
      });

      if (namespace === 'user') {
        currentSocket.on('connect', () => currentSocket?.emit('join', userId));
      }
      socketRef.current = currentSocket;
      setSocket(currentSocket);
    }

    void connect();

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
      currentSocket?.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [status, role, userId]);

  const value = useMemo<SocketContextValue>(() => ({ socket }), [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

/**
 * Subscribe to a socket event with a stable handler.
 *
 * The handler is stored in a ref so consumers can pass an inline function
 * without causing the listener to be removed/re-added every render.
 */
export function useSocketEvent<T = any>(event: string, handler: (payload: T) => void) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket) return;
    const wrap = (payload: T) => handlerRef.current(payload);
    socket.on(event, wrap);
    return () => {
      socket.off(event, wrap);
    };
  }, [socket, event]);
}

/**
 * Coalesce rapid socket events (or any async trigger) into a single
 * debounced invocation. Useful for refreshing dashboards on bursts.
 */
export function useDebouncedRefresh(fn: () => void | Promise<void>, delay = 200) {
  const fnRef = useRef(fn);
  const timerRef = useRef<number | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (aliveRef.current) void fnRef.current();
    }, delay);
  }, [delay]);
}
