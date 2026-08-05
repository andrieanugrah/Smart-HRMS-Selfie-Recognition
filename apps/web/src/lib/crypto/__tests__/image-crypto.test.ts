/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { encryptImage, decryptImage, encryptedBufferToDataUrl, dataUrlToBuffer } from '../image-crypto';

// ponytail: process.env must be set before importing the module
process.env.FACE_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function makeBuffer() {
  const canvas = new Uint8Array(1024);
  for (let i = 0; i < canvas.length; i++) canvas[i] = i % 256;
  return Buffer.from(canvas);
}

describe('image-crypto', () => {
  it('roundtrips binary payload', () => {
    const plain = makeBuffer();
    const encrypted = encryptImage(plain);
    expect(encrypted.length).toBeGreaterThan(plain.length);

    const decrypted = decryptImage(encrypted);
    expect(decrypted.equals(plain)).toBe(true);
  });

  it('tampered ciphertext fails authentication', () => {
    const plain = makeBuffer();
    const encrypted = encryptImage(plain);
    encrypted[encrypted.length - 1] ^= 0xff;

    expect(() => decryptImage(encrypted)).toThrow();
  });

  it('data URL roundtrip preserves bytes', () => {
    const plain = makeBuffer();
    const encrypted = encryptImage(plain);
    const dataUrl = encryptedBufferToDataUrl(encrypted);
    const recovered = dataUrlToBuffer(dataUrl);
    const decrypted = decryptImage(recovered);
    expect(decrypted.equals(plain)).toBe(true);
  });

  it('rejects invalid encryption key', () => {
    const validKey = process.env.FACE_ENCRYPTION_KEY;
    process.env.FACE_ENCRYPTION_KEY = 'short-password';
    expect(() => encryptImage(makeBuffer())).toThrow('FACE_ENCRYPTION_KEY must be 64-character hex or 32-byte base64');
    process.env.FACE_ENCRYPTION_KEY = validKey;
  });
});
