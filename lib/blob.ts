import { put } from '@vercel/blob';
import { BlobRef } from './types';

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Upload a file to Vercel Blob and return a BlobRef descriptor.
 * Throws if BLOB_READ_WRITE_TOKEN is not set.
 */
export async function uploadFile(
  pathname: string,
  body: Buffer | Blob | ArrayBuffer | ReadableStream,
  contentType: string
): Promise<BlobRef> {
  const result = await put(pathname, body, {
    access: 'public',
    contentType,
    addRandomSuffix: true,
  });
  return {
    url: result.url,
    pathname: result.pathname,
    size: typeof body === 'object' && 'size' in body ? (body as Blob).size : 0,
    contentType,
    uploadedAt: new Date().toISOString(),
  };
}
