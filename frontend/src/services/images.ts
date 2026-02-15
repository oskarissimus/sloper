// Image Generation Service
// Handles OpenAI image generation with brightness correction and transparency flattening

export interface ImageGenerationOptions {
  prompt: string;
  model: string;
  quality: 'low' | 'medium' | 'high';
  size: string; // e.g., "1024x1536"
}

export interface ImageResult {
  data: Blob;
  dataUrl: string;
}

// Constants for image processing
const BRIGHTNESS_THRESHOLD = 50;
const BRIGHTNESS_BOOST = 1.5;
const CONTRAST_BOOST = 1.2;
const JPEG_QUALITY = 0.85;

/**
 * Convert a Blob to base64 string (without data URL prefix)
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate an image using OpenAI's image generation API
 */
/**
 * Map a requested size to the closest supported DALL-E 3 size
 * DALL-E 3 only supports: 1024x1024, 1024x1792, 1792x1024
 */
function normalizeImageSize(requestedSize: string, model: string): string {
  // DALL-E 3 supported sizes
  const dalle3Sizes = ['1024x1024', '1024x1792', '1792x1024'];
  // DALL-E 2 supported sizes
  const dalle2Sizes = ['256x256', '512x512', '1024x1024'];

  const supportedSizes = model === 'dall-e-3' ? dalle3Sizes : dalle2Sizes;

  // If the requested size is already supported, use it
  if (supportedSizes.includes(requestedSize)) {
    return requestedSize;
  }

  // Parse requested dimensions
  const [reqWidth, reqHeight] = requestedSize.split('x').map(Number);
  const aspectRatio = reqWidth / reqHeight;

  // For DALL-E 3, pick the closest aspect ratio
  if (model === 'dall-e-3') {
    if (aspectRatio < 0.75) {
      // Very tall/portrait -> use 1024x1792
      return '1024x1792';
    } else if (aspectRatio > 1.33) {
      // Very wide/landscape -> use 1792x1024
      return '1792x1024';
    } else {
      // Close to square -> use 1024x1024
      return '1024x1024';
    }
  }

  // Default fallback
  return '1024x1024';
}

export async function generateImage(
  apiKey: string,
  options: ImageGenerationOptions
): Promise<ImageResult> {
  // Normalize model name - gpt-image-1 should be dall-e-3
  const model = options.model === 'gpt-image-1' ? 'dall-e-3' : options.model;

  // Normalize size to supported values
  const size = normalizeImageSize(options.size, model);

  // Build request body - dall-e-3 supports b64_json, dall-e-2 does too
  const requestBody: Record<string, unknown> = {
    model,
    prompt: options.prompt,
    n: 1,
    size,
  };

  // Only add quality for dall-e-3
  if (model === 'dall-e-3') {
    requestBody.quality = options.quality === 'high' ? 'hd' : 'standard';
  }

  // Add response_format for supported models
  if (model === 'dall-e-3' || model === 'dall-e-2') {
    requestBody.response_format = 'b64_json';
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Image generation failed: ${response.status}`);
  }

  const result = await response.json();

  // Handle either b64_json or url response
  let base64: string;
  if (result.data[0].b64_json) {
    base64 = result.data[0].b64_json;
  } else if (result.data[0].url) {
    // Fetch the image from URL and convert to base64
    const imageResponse = await fetch(result.data[0].url);
    const imageBlob = await imageResponse.blob();
    base64 = await blobToBase64(imageBlob);
  } else {
    throw new Error('No image data in response');
  }

  // Convert base64 to Blob
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'image/png' });
  const dataUrl = `data:image/png;base64,${base64}`;

  return { data: blob, dataUrl };
}

/**
 * Calculate the average brightness of an image
 * Returns a value from 0 (black) to 255 (white)
 */
export function calculateBrightness(imageDataUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let totalBrightness = 0;
      const pixelCount = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        // Calculate perceived brightness using luminance formula
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        totalBrightness += brightness;
      }

      resolve(totalBrightness / pixelCount);
    };
    img.onerror = () => reject(new Error('Failed to load image for brightness calculation'));
    img.src = imageDataUrl;
  });
}

/**
 * Apply brightness and contrast correction to a dark image
 */
export function correctBrightness(imageDataUrl: string): Promise<ImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Apply brightness/contrast filter
      ctx.filter = `brightness(${BRIGHTNESS_BOOST}) contrast(${CONTRAST_BOOST})`;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const dataUrl = canvas.toDataURL('image/png');
            resolve({ data: blob, dataUrl });
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        'image/png'
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for brightness correction'));
    img.src = imageDataUrl;
  });
}

/**
 * Check if an image has any transparent pixels
 */
export function hasTransparency(imageDataUrl: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Check alpha channel (every 4th byte starting at index 3)
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          resolve(true);
          return;
        }
      }
      resolve(false);
    };
    img.onerror = () => reject(new Error('Failed to load image for transparency check'));
    img.src = imageDataUrl;
  });
}

/**
 * Flatten transparent image to white background
 */
export function flattenTransparency(imageDataUrl: string): Promise<ImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Fill white background first
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw image on top
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const dataUrl = canvas.toDataURL('image/png');
            resolve({ data: blob, dataUrl });
          } else {
            reject(new Error('Failed to flatten transparency'));
          }
        },
        'image/png'
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for transparency flattening'));
    img.src = imageDataUrl;
  });
}

/**
 * Convert an image to JPEG format to reduce payload size
 */
export function convertToJpeg(imageDataUrl: string): Promise<ImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Fill white background (JPEG has no alpha channel)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
            resolve({ data: blob, dataUrl });
          } else {
            reject(new Error('Failed to convert image to JPEG'));
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for JPEG conversion'));
    img.src = imageDataUrl;
  });
}

/**
 * Process an image: check brightness and transparency, apply corrections if needed,
 * then convert to JPEG to reduce payload size for video assembly.
 */
export async function processImage(
  imageDataUrl: string,
  imageBlob: Blob
): Promise<ImageResult> {
  let result: ImageResult = { data: imageBlob, dataUrl: imageDataUrl };

  // Check and fix transparency first
  const transparent = await hasTransparency(imageDataUrl);
  if (transparent) {
    console.log('Image has transparency, flattening to white background...');
    result = await flattenTransparency(result.dataUrl);
  }

  // Check and fix brightness
  const brightness = await calculateBrightness(result.dataUrl);
  if (brightness < BRIGHTNESS_THRESHOLD) {
    console.log(`Image brightness ${brightness.toFixed(1)} below threshold ${BRIGHTNESS_THRESHOLD}, correcting...`);
    result = await correctBrightness(result.dataUrl);
  }

  // Convert to JPEG to reduce payload size
  result = await convertToJpeg(result.dataUrl);

  return result;
}

/**
 * Concurrency limiter for parallel task execution
 */
export class ConcurrencyLimiter<T> {
  private queue: Array<{
    task: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: unknown) => void;
  }> = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  async add(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      this.running++;
      item
        .task()
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          this.running--;
          this.processQueue();
        });
    }
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get runningCount(): number {
    return this.running;
  }
}

// Nano Banana (Gemini image generation) support

export interface NanoBananaGenerationOptions {
  prompt: string;
  model: string;
  aspectRatio: string;
}

/**
 * Map pixel dimensions to the nearest supported Gemini aspect ratio
 */
export function deriveAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  const supported = [
    { label: '16:9', value: 16 / 9 },
    { label: '9:16', value: 9 / 16 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:4', value: 3 / 4 },
    { label: '1:1', value: 1 },
  ];

  let closest = supported[0];
  let minDiff = Math.abs(ratio - closest.value);
  for (const s of supported) {
    const diff = Math.abs(ratio - s.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }
  return closest.label;
}

/**
 * Generate an image using Google's Gemini image generation API (Nano Banana)
 */
export async function generateNanoBananaImage(
  apiKey: string,
  options: NanoBananaGenerationOptions
): Promise<ImageResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: options.prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: options.aspectRatio,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `Nano Banana image generation failed: ${response.status}`
    );
  }

  const result = await response.json();

  // Find the inline image data in the response
  const candidates = result.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('No candidates in Nano Banana response');
  }

  const parts = candidates[0].content?.parts;
  if (!parts) {
    throw new Error('No parts in Nano Banana response');
  }

  const imagePart = parts.find(
    (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart) {
    // Likely a safety filter refusal - check for text response
    const textPart = parts.find((p: { text?: string }) => p.text);
    const reason = textPart?.text || 'Unknown reason';
    throw new Error(`Nano Banana refused to generate image: ${reason}`);
  }

  const { mimeType, data: base64 } = imagePart.inlineData;

  // Convert base64 to Blob
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  const dataUrl = `data:${mimeType};base64,${base64}`;

  return { data: blob, dataUrl };
}

// Export singleton limiters
export const imageLimiter = new ConcurrencyLimiter<ImageResult>(12);
