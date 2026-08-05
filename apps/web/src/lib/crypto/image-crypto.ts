import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const raw = process.env.FACE_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('FACE_ENCRYPTION_KEY belum dikonfigurasi');
  }

  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }

  if (Buffer.from(raw, 'base64').length === KEY_LENGTH) {
    return Buffer.from(raw, 'base64');
  }

  throw new Error('FACE_ENCRYPTION_KEY must be 64-character hex or 32-byte base64');
}

export function encryptImage(plaintextBuffer: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decryptImage(encryptedBuffer: Buffer): Buffer {
  const key = getEncryptionKey();
  if (encryptedBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted image buffer');
  }
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function isEncryptedImage(dataUrlOrUrl: string): boolean {
  return dataUrlOrUrl.startsWith('data:application/octet-stream;') || dataUrlOrUrl.startsWith('enc:');
}

export function encryptedBufferToDataUrl(buffer: Buffer): string {
  return `data:application/octet-stream;base64,${buffer.toString('base64')}`;
}

export function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URL');
  }
  return Buffer.from(match[2], 'base64');
}
