import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDecryptedImageUrl } from '../images';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  decryptImage: vi.fn(() => Buffer.from('decrypted-image-bytes')),
  download: vi.fn(() => Promise.resolve({ data: new Blob(['encrypted']), error: null })),
  getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })),
  storageFrom: vi.fn(() => ({
    download: vi.fn(() => Promise.resolve({ data: new Blob(['encrypted']), error: null })),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })),
  })),
}));

vi.mock('../_utils', async () => {
  const actual = await vi.importActual('../_utils');
  return {
    ...actual,
    requireUser: mocks.requireUser,
    getSupabaseAdmin: vi.fn(() => ({
      storage: { from: mocks.storageFrom },
    })),
  };
});

vi.mock('@/lib/crypto/image-crypto', () => ({
  decryptImage: mocks.decryptImage,
}));

const AVATAR_URL =
  'https://example.supabase.co/storage/v1/object/public/avatars/u1/2025-01-01_123456.bin';
const SELFIE_URL =
  'https://example.supabase.co/storage/v1/object/public/selfies/u1/2025-01-01_123456.bin';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.storageFrom.mockReturnValue({
    download: mocks.download,
    getPublicUrl: mocks.getPublicUrl,
  });
});

describe('getDecryptedImageUrl authorization', () => {
  it('passes through non-storage URLs unchanged', async () => {
    const url = 'https://example.com/image.png';
    await expect(getDecryptedImageUrl(url)).resolves.toBe(url);
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  it('passes through legacy unencrypted storage URLs unchanged', async () => {
    const url =
      'https://example.supabase.co/storage/v1/object/public/avatars/u1/2025-01-01_123456.jpg';
    await expect(getDecryptedImageUrl(url)).resolves.toBe(url);
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  it('allows owner to decrypt their own avatar', async () => {
    mocks.requireUser.mockResolvedValue({ id: 'u1', role: 'employee' });
    await expect(getDecryptedImageUrl(AVATAR_URL)).resolves.toMatch(
      /^data:image\/jpeg;base64,/
    );
  });

  it('allows owner to decrypt their own selfie', async () => {
    mocks.requireUser.mockResolvedValue({ id: 'u1', role: 'employee' });
    await expect(getDecryptedImageUrl(SELFIE_URL)).resolves.toMatch(
      /^data:image\/jpeg;base64,/
    );
  });

  it('rejects employee viewing another users avatar', async () => {
    mocks.requireUser.mockResolvedValue({ id: 'u2', role: 'employee' });
    await expect(getDecryptedImageUrl(AVATAR_URL)).resolves.toBeNull();
  });

  it('rejects employee viewing another users selfie', async () => {
    mocks.requireUser.mockResolvedValue({ id: 'u2', role: 'employee' });
    await expect(getDecryptedImageUrl(SELFIE_URL)).resolves.toBeNull();
  });

  it('rejects path traversal that passes split check but resolves to victim', async () => {
    mocks.requireUser.mockResolvedValue({ id: 'u1', role: 'employee' });
    const traversalUrl =
      'https://example.supabase.co/storage/v1/object/public/selfies/u1/../u2/2025-01-01_123456.bin';
    await expect(getDecryptedImageUrl(traversalUrl)).resolves.toBeNull();
    // download should not be invoked for a forbidden path
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it.each(['hrd', 'admin'])('allows %s to decrypt any avatar', async (role) => {
    mocks.requireUser.mockResolvedValue({ id: 'u2', role });
    await expect(getDecryptedImageUrl(AVATAR_URL)).resolves.toMatch(
      /^data:image\/jpeg;base64,/
    );
  });

  it.each(['hrd', 'admin'])('allows %s to decrypt any selfie', async (role) => {
    mocks.requireUser.mockResolvedValue({ id: 'u2', role });
    await expect(getDecryptedImageUrl(SELFIE_URL)).resolves.toMatch(
      /^data:image\/jpeg;base64,/
    );
  });

  it('returns null when download fails', async () => {
    mocks.requireUser.mockResolvedValue({ id: 'u1', role: 'employee' });
    mocks.download.mockResolvedValueOnce({ data: null as any, error: { message: 'not found' } as any });
    await expect(getDecryptedImageUrl(AVATAR_URL)).resolves.toBeNull();
  });
});
