import 'server-only';

const SOCKET_INTERNAL_URL = process.env.SOCKET_INTERNAL_URL ?? 'http://localhost:5000';

interface EmitOptions {
  /** Show toast notification to user */
  toast?: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  };
}

async function emit(
  namespace: 'hrd' | 'user',
  target: string | null,
  event: string,
  payload: unknown,
  _options?: EmitOptions
) {
  const url = `${SOCKET_INTERNAL_URL}/emit/${namespace}`;
  const internalSecret = process.env.INTERNAL_SOCKET_SECRET;
  if (!internalSecret) {
    console.warn('[emit] INTERNAL_SOCKET_SECRET belum dikonfigurasi; real-time event diabaikan');
    return;
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({ target, event, payload }),
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) {
      console.warn(`[emit] ${url} returned ${response.status}`);
    }
  } catch (error) {
    // Best-effort: realtime socket tidak boleh menahan critical path
    // server action (mis. checkIn, approveLeave). Log lalu return.
    console.warn('[emit] failed', url, error instanceof Error ? error.message : error);
  }
}

export function emitToHRD(event: string, payload: unknown) {
  return emit('hrd', null, event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  return emit('user', userId, event, payload);
}
