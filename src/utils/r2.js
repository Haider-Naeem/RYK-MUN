import imageCompression from 'browser-image-compression';

const WORKER_URL    = import.meta.env.VITE_R2_WORKER_URL;
const UPLOAD_SECRET = import.meta.env.VITE_R2_UPLOAD_SECRET;

/**
 * Upload a file to Cloudflare R2 via the Worker proxy.
 * Images are compressed before upload.
 * @param {File}   file - the File object
 * @param {string} path - storage path, e.g. "profiles/uid/photo.jpg"
 * @returns {Promise<string>} public URL
 */
export async function uploadToR2(file, path) {
  let fileToUpload = file;

  if (file.type.startsWith('image/')) {
    try {
      fileToUpload = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });
    } catch {
      // compression failed — use original
    }
  }

  const res = await fetch(`${WORKER_URL}/${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type':    file.type || 'application/octet-stream',
      'X-Upload-Secret': UPLOAD_SECRET,
    },
    body: fileToUpload,
  });

  if (!res.ok) {
    throw new Error(`R2 upload failed: ${res.status} ${res.statusText}`);
  }

  const { url } = await res.json();
  return url;
}