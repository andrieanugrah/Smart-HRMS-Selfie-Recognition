'use client';

const MODEL_URL = '/models';

type FaceApiModule = typeof import('face-api.js');
let faceapiRef: FaceApiModule | null = null;
let loadPromise: Promise<FaceApiModule> | null = null;
let loaded = false;

/**
 * Lazy-load face-api.js and the model weights. Subsequent calls return the
 * same module instance. If a load fails, the promise is cleared so callers
 * can retry.
 */
export async function loadFaceModels(): Promise<FaceApiModule> {
  if (faceapiRef && loaded) return faceapiRef;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    console.log('[face-api] loading models from', MODEL_URL);

    const probe = await fetch(
      `${MODEL_URL}/tiny_face_detector_model-weights_manifest.json`
    );
    if (!probe.ok) {
      loadPromise = null;
      throw new Error(
        `Model files not found at ${MODEL_URL} (status ${probe.status}). ` +
        `Make sure all .json manifests and -shard1/-shard2 files are in apps/web/public/models/.`
      );
    }

    const faceapi = await import('face-api.js');

    try {
      const tf = (faceapi as any).tf;
      if (tf && typeof tf.setBackend === 'function') {
        const backendFactories = tf.engine?.().registryFactory;
        if (backendFactories?.cpu) {
          await tf.setBackend('cpu');
          await tf.ready();
        } else if (typeof tf.ready === 'function') {
          await tf.ready();
        }
      }
    } catch (error) {
      console.warn('[face-api] backend initialization skipped', error);
    }

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    faceapiRef = faceapi;
    loaded = true;
    console.log('[face-api] models loaded');
    return faceapi;
  })().catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

export function getFaceApi(): FaceApiModule | null {
  return faceapiRef;
}

export function isModelsLoaded(): boolean {
  return loaded;
}
