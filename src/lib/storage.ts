const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  key: string;
}

export async function uploadCoverImage(
  bucket: R2Bucket,
  partyId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error(`Unsupported image type: ${contentType}. Use JPEG, PNG, or WebP.`);
  }
  if (data.byteLength > MAX_BYTES) {
    throw new Error('Image exceeds 5MB limit.');
  }
  const key = `parties/${partyId}/cover`;
  await bucket.put(key, data, { httpMetadata: { contentType } });
  return { key };
}

export async function getCoverImage(
  bucket: R2Bucket,
  partyId: string
): Promise<R2ObjectBody | null> {
  return bucket.get(`parties/${partyId}/cover`);
}

export async function deleteCoverImage(
  bucket: R2Bucket,
  partyId: string
): Promise<void> {
  await bucket.delete(`parties/${partyId}/cover`);
}
