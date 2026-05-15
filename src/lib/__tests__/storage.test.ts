import { describe, it, expect, vi } from 'vitest';
import { uploadCoverImage, getCoverImage, deleteCoverImage } from '../storage';

function createMockBucket(overrides: Partial<R2Bucket> = {}): R2Bucket {
  return {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    head: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue({ objects: [], truncated: false, cursor: undefined, delimitedPrefixes: [] }),
    createMultipartUpload: vi.fn(),
    resumeMultipartUpload: vi.fn(),
    ...overrides,
  } as unknown as R2Bucket;
}

describe('uploadCoverImage', () => {
  it('stores image with correct key and content type', async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const bucket = createMockBucket({ put });
    const data = new ArrayBuffer(100);
    const result = await uploadCoverImage(bucket, 'party-123', data, 'image/jpeg');
    expect(result.key).toBe('parties/party-123/cover');
    expect(put).toHaveBeenCalledWith(
      'parties/party-123/cover',
      data,
      { httpMetadata: { contentType: 'image/jpeg' } }
    );
  });

  it('rejects unsupported content type', async () => {
    const bucket = createMockBucket();
    const data = new ArrayBuffer(100);
    await expect(
      uploadCoverImage(bucket, 'party-123', data, 'image/gif')
    ).rejects.toThrow('Unsupported image type');
  });

  it('rejects files over 5MB', async () => {
    const bucket = createMockBucket();
    const data = new ArrayBuffer(5 * 1024 * 1024 + 1);
    await expect(
      uploadCoverImage(bucket, 'party-123', data, 'image/png')
    ).rejects.toThrow('5MB');
  });
});

describe('getCoverImage', () => {
  it('calls bucket.get with correct key', async () => {
    const mockObj = { body: new ReadableStream(), httpMetadata: { contentType: 'image/jpeg' } };
    const get = vi.fn().mockResolvedValue(mockObj);
    const bucket = createMockBucket({ get });
    const result = await getCoverImage(bucket, 'party-123');
    expect(get).toHaveBeenCalledWith('parties/party-123/cover');
    expect(result).toBe(mockObj);
  });

  it('returns null when image not found', async () => {
    const bucket = createMockBucket({ get: vi.fn().mockResolvedValue(null) });
    const result = await getCoverImage(bucket, 'party-123');
    expect(result).toBeNull();
  });
});

describe('deleteCoverImage', () => {
  it('calls bucket.delete with correct key', async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    const bucket = createMockBucket({ delete: deleteFn });
    await deleteCoverImage(bucket, 'party-123');
    expect(deleteFn).toHaveBeenCalledWith('parties/party-123/cover');
  });
});
