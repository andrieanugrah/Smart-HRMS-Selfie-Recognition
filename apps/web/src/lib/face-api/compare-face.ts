import { deserializeDescriptor } from './detect-face';

function euclideanDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

export function compareDescriptors(
  source: number[],
  target: number[],
  threshold: number = 0.6
): { match: boolean; distance: number } {
  const src = deserializeDescriptor(source);
  const tgt = deserializeDescriptor(target);
  const distance = euclideanDistance(src, tgt);

  return {
    match: distance < threshold,
    distance,
  };
}
