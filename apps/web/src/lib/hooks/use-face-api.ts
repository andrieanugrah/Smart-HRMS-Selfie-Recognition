'use client';

import { useEffect, useState, useCallback } from 'react';
import { loadFaceModels, isModelsLoaded, resetFaceModels } from '@/lib/face-api/load-models';

export interface FaceApiState {
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

/**
 * Hook to lazy-load face-api.js models on mount and expose the load state.
 * Models are loaded once per browser session (singleton in load-models.ts).
 */
export function useFaceApi(): FaceApiState & { ensureLoaded: () => Promise<void>; retry: () => Promise<void> } {
  const [state, setState] = useState<FaceApiState>({
    loading: false,
    loaded: isModelsLoaded(),
    error: null,
  });

  const ensureLoaded = useCallback(async () => {
    if (isModelsLoaded()) {
      setState({ loading: false, loaded: true, error: null });
      return;
    }
    setState({ loading: true, loaded: false, error: null });
    try {
      await loadFaceModels();
      setState({ loading: false, loaded: true, error: null });
    } catch (e: any) {
      setState({
        loading: false,
        loaded: false,
        error: e?.message || 'Gagal memuat model face-api',
      });
    }
  }, []);

  const retry = useCallback(async () => {
    resetFaceModels();
    await ensureLoaded();
  }, [ensureLoaded]);

  useEffect(() => {
    if (!isModelsLoaded() && !state.loading) {
      ensureLoaded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, ensureLoaded, retry };
}
