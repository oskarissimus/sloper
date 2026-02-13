// Video Assembly Service
// Client for backend video assembly API

export interface SceneMetadata {
  index: number;
  imageDuration: number;
}

export interface Resolution {
  width: number;
  height: number;
}

export interface AssemblyMetadata {
  scenes: SceneMetadata[];
  resolution: Resolution;
  frameRate: number;
}

export interface AssemblyResult {
  video: Blob;
  duration: number;
}

/**
 * Send assets to backend for video assembly
 *
 * @param backendUrl - URL of the video assembly backend
 * @param metadata - Assembly configuration (scenes, resolution, frameRate)
 * @param images - Image blobs in scene order
 * @param audioFiles - Audio blobs in scene order
 * @returns Assembled video blob and duration
 */
export async function assembleVideo(
  backendUrl: string,
  metadata: AssemblyMetadata,
  images: Blob[],
  audioFiles: Blob[]
): Promise<AssemblyResult> {
  const formData = new FormData();

  // Add metadata as JSON string
  formData.append('metadata', JSON.stringify(metadata));

  // Add images in order (backend expects 'images' field)
  images.forEach((img, i) => {
    formData.append('images', img, `image_${i}.jpg`);
  });

  // Add audio files in order (backend expects 'audio' field)
  audioFiles.forEach((audio, i) => {
    formData.append('audio', audio, `audio_${i}.mp3`);
  });

  const response = await fetch(`${backendUrl}/assemble-video`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = 'Video assembly failed';
    try {
      const error = await response.json();
      errorMessage = error.detail?.message || error.message || errorMessage;
    } catch {
      // If JSON parsing fails, use status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const video = await response.blob();
  const duration = parseFloat(response.headers.get('X-Video-Duration') || '0');

  return { video, duration };
}

/**
 * Get the default backend URL from environment or fallback
 */
export function getBackendUrl(): string {
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
}
