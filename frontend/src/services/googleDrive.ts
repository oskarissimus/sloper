const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB (multiple of 256KB)

let gisPromise: Promise<void> | null = null;

export function loadGisScript(): Promise<void> {
  if (gisPromise) return gisPromise;

  gisPromise = new Promise<void>((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts?.oauth2) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisPromise = null;
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(script);
  });

  return gisPromise;
}

export function requestAccessToken(clientId: string): Promise<google.accounts.oauth2.TokenResponse> {
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error));
        } else {
          resolve(response);
        }
      },
      error_callback: (error) => {
        reject(new Error(error.message ?? 'OAuth error'));
      },
    });

    client.requestAccessToken();
  });
}

export interface UploadResult {
  fileId: string;
  webViewLink: string;
}

export async function uploadToDrive(
  accessToken: string,
  file: Blob,
  filename: string,
  onProgress?: (fraction: number) => void,
): Promise<UploadResult> {
  // Initiate resumable upload session
  const metadata = {
    name: filename,
    mimeType: 'video/mp4',
  };

  const initResponse = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=resumable`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': String(file.size),
    },
    body: JSON.stringify(metadata),
  });

  if (!initResponse.ok) {
    const text = await initResponse.text();
    throw new Error(`Failed to initiate upload: ${initResponse.status} ${text}`);
  }

  const sessionUri = initResponse.headers.get('Location');
  if (!sessionUri) {
    throw new Error('No upload session URI returned');
  }

  // Upload in chunks
  let offset = 0;
  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    const chunk = file.slice(offset, end);

    const putResponse = await fetch(sessionUri, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${offset}-${end - 1}/${file.size}`,
      },
      body: chunk,
    });

    if (putResponse.status === 200 || putResponse.status === 201) {
      // Upload complete
      onProgress?.(1);
      const result = await putResponse.json();
      // Fetch webViewLink since resumable upload doesn't return it by default
      const fileResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${result.id}?fields=webViewLink`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const fileData = await fileResponse.json();
      return {
        fileId: result.id,
        webViewLink: fileData.webViewLink,
      };
    }

    if (putResponse.status !== 308) {
      const text = await putResponse.text();
      throw new Error(`Upload failed at byte ${offset}: ${putResponse.status} ${text}`);
    }

    offset = end;
    onProgress?.(offset / file.size);
  }

  throw new Error('Upload ended unexpectedly');
}
