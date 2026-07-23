import { loadFaceModels } from './load-models';

export interface DetectionResult {
  descriptor: Float32Array | null;
  detection: unknown | null;
  landmarks: unknown | null;
}

let detectorOptions: unknown = null;
let faceapiRef: typeof import('face-api.js') | null = null;

async function getDetector() {
  if (detectorOptions && faceapiRef) return { faceapi: faceapiRef, options: detectorOptions };
  const faceapi = await loadFaceModels();
  faceapiRef = faceapi;
  detectorOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.4,
  });
  return { faceapi, options: detectorOptions };
}

/**
 * Detect a single face and return its descriptor.
 *
 * IMPORTANT: caller MUST ensure models are loaded first via `loadFaceModels()`.
 * Otherwise the underlying network call will hang/fail.
 */
export async function detectFace(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<DetectionResult> {
  const { faceapi, options } = await getDetector();

  const result = await faceapi
    .detectSingleFace(input, options as any)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) {
    return { descriptor: null, detection: null, landmarks: null };
  }

  return {
    descriptor: result.descriptor,
    detection: result.detection,
    landmarks: result.landmarks,
  };
}

export function serializeDescriptor(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}

export function deserializeDescriptor(data: number[]): Float32Array {
  return new Float32Array(data);
}
