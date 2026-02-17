import { useCallback, useEffect, useRef, useState } from 'react';
import type { UploadResult } from '../services/googleDrive';
import { loadGisScript, requestAccessToken, uploadToDrive } from '../services/googleDrive';

export type UploadStatus =
  | 'idle'
  | 'loading-gis'
  | 'authenticating'
  | 'uploading'
  | 'success'
  | 'error';

interface UploadState {
  status: UploadStatus;
  progress: number;
  result: UploadResult | null;
  error: string | null;
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function useGoogleDriveUpload() {
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    result: null,
    error: null,
  });

  const tokenRef = useRef<{ accessToken: string; expiresAt: number } | null>(null);

  // Preload GIS script on mount so it's ready when user clicks
  useEffect(() => {
    if (CLIENT_ID) {
      loadGisScript().catch(() => {
        // Swallow — will retry on upload
      });
    }
  }, []);

  const upload = useCallback(async (video: Blob) => {
    if (!CLIENT_ID) return;

    try {
      // Load GIS
      setState({ status: 'loading-gis', progress: 0, result: null, error: null });
      await loadGisScript();

      // Authenticate (reuse cached token if still valid)
      const now = Date.now();
      if (!tokenRef.current || tokenRef.current.expiresAt < now) {
        setState((s) => ({ ...s, status: 'authenticating' }));
        const tokenResponse = await requestAccessToken(CLIENT_ID);
        tokenRef.current = {
          accessToken: tokenResponse.access_token,
          expiresAt: now + (tokenResponse.expires_in - 60) * 1000,
        };
      }

      // Upload
      setState((s) => ({ ...s, status: 'uploading', progress: 0 }));
      const filename = `slop-video-${new Date().toISOString().split('T')[0]}.mp4`;
      const result = await uploadToDrive(
        tokenRef.current.accessToken,
        video,
        filename,
        (fraction) => setState((s) => ({ ...s, progress: fraction })),
      );

      setState({ status: 'success', progress: 1, result, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setState((s) => ({ ...s, status: 'error', error: message }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', progress: 0, result: null, error: null });
  }, []);

  return { ...state, upload, reset };
}
