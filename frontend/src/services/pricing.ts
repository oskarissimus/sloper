import pricingData from '../data/pricing.json';

// --- Types ---

export interface LlmPricing {
  input: number;
  cachedInput: number | null;
  output: number;
}

export interface LlmCostEstimate {
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  modelFound: boolean;
}

export interface ImageCostEstimate {
  perImage: number | null;
  total: number | null;
  isGemini: boolean;
  modelFound: boolean;
}

export type TtsPlan = 'free' | 'starter' | 'creator' | 'pro' | 'scale' | 'business';

export interface TtsCostEstimate {
  totalChars: number;
  perKChars: number | null;
  totalCost: number | null;
  modelFound: boolean;
}

// --- Data access ---

export const SCRAPED_AT = pricingData.scrapedAt;

const llmPricing = pricingData.llm as Record<string, LlmPricing>;
const imagePricing = pricingData.image as Record<string, Record<string, Record<string, number>>>;
const geminiImagePricing = pricingData.geminiImage as Record<string, number>;
const ttsPricing = pricingData.tts as Record<string, Record<string, number | null>>;

const DEFAULT_LLM_MODEL = 'gpt-4o';
const AVG_CHARS_PER_WORD = 5;

// --- LLM cost estimation ---

export function estimateLlmCost(
  model: string,
  targetDuration: number,
  numScenes: number
): LlmCostEstimate {
  const targetWords = targetDuration * 2.5;
  const promptTokens = 200;
  const completionTokens = Math.ceil(targetWords * 1.3 + numScenes * 100);

  const pricing = llmPricing[model];
  const modelFound = !!pricing;
  const rates = pricing || llmPricing[DEFAULT_LLM_MODEL];

  const totalCost =
    (promptTokens / 1_000_000) * rates.input +
    (completionTokens / 1_000_000) * rates.output;

  return { promptTokens, completionTokens, totalCost, modelFound };
}

// --- Image cost estimation ---

/**
 * Map resolution to the closest supported size for pricing lookup.
 * Mirrors the normalizeImageSize logic in images.ts.
 */
function normalizeSizeForPricing(
  width: number,
  height: number,
  model: string
): string {
  const requestedSize = `${width}x${height}`;
  const effectiveModel = model === 'gpt-image-1' ? 'dall-e-3' : model;

  // Check which sizes exist in pricing data for this model
  const modelPricing = imagePricing[model];
  if (!modelPricing) return '1024x1024';

  // Get any quality tier to find available sizes
  const firstQuality = Object.values(modelPricing)[0];
  if (!firstQuality) return '1024x1024';

  const availableSizes = Object.keys(firstQuality);
  if (availableSizes.includes(requestedSize)) return requestedSize;

  // Pick by aspect ratio
  const ratio = width / height;

  if (effectiveModel === 'dall-e-2') {
    return '1024x1024';
  }

  // For DALL-E 3 style sizes
  if (availableSizes.some(s => s.includes('1792'))) {
    if (ratio < 0.75) return '1024x1792';
    if (ratio > 1.33) return '1792x1024';
    return '1024x1024';
  }

  // For gpt-image-1 style sizes (1024x1536)
  if (ratio < 0.75) return '1024x1536';
  if (ratio > 1.33) return '1536x1024';
  return '1024x1024';
}

/**
 * Map config quality values to pricing quality keys.
 * Config uses 'low'|'medium'|'high', DALL-E 3 pricing uses 'standard'|'hd'.
 */
function normalizeQualityForPricing(
  quality: 'low' | 'medium' | 'high',
  model: string
): string {
  const modelPricing = imagePricing[model];
  if (!modelPricing) return quality;

  const availableQualities = Object.keys(modelPricing);

  // gpt-image-1 and friends use low/medium/high directly
  if (availableQualities.includes(quality)) return quality;

  // dall-e-3 uses standard/hd
  if (availableQualities.includes('standard')) {
    return quality === 'high' ? 'hd' : 'standard';
  }

  return availableQualities[0] || quality;
}

/**
 * Look up Gemini image model pricing.
 * Tries exact match first, then prefix match against known models.
 */
function lookupGeminiImagePrice(model: string): number | null {
  // Exact match
  if (model in geminiImagePricing) return geminiImagePricing[model];

  // Prefix match: find the longest matching key
  let best: { key: string; price: number } | null = null;
  for (const [key, price] of Object.entries(geminiImagePricing)) {
    if (model.startsWith(key) && (!best || key.length > best.key.length)) {
      best = { key, price };
    }
  }
  return best?.price ?? null;
}

export function estimateImageCost(
  provider: 'openai' | 'google',
  model: string,
  quality: 'low' | 'medium' | 'high',
  resolution: { width: number; height: number },
  numScenes: number
): ImageCostEstimate {
  if (provider === 'google') {
    const perImage = lookupGeminiImagePrice(model);
    return {
      perImage,
      total: perImage !== null ? perImage * numScenes : null,
      isGemini: true,
      modelFound: perImage !== null,
    };
  }

  const modelPricing = imagePricing[model];
  if (!modelPricing) {
    return { perImage: null, total: null, isGemini: false, modelFound: false };
  }

  const qualityKey = normalizeQualityForPricing(quality, model);
  const sizeKey = normalizeSizeForPricing(resolution.width, resolution.height, model);

  const qualityPricing = modelPricing[qualityKey];
  const perImage = qualityPricing?.[sizeKey] ?? null;

  return {
    perImage,
    total: perImage !== null ? perImage * numScenes : null,
    isGemini: false,
    modelFound: true,
  };
}

// --- TTS cost estimation ---

/**
 * Map ElevenLabs model IDs to pricing category keys.
 */
function ttsPricingCategory(modelId: string): string {
  if (modelId.includes('turbo') || modelId.includes('flash')) {
    return 'flash_turbo';
  }
  return 'multilingual_v2_v3';
}

export function estimateTtsCost(
  ttsModel: string,
  plan: TtsPlan,
  targetDuration: number
): TtsCostEstimate {
  const targetWords = targetDuration * 2.5;
  const totalChars = Math.round(targetWords * AVG_CHARS_PER_WORD);

  const category = ttsPricingCategory(ttsModel);
  const categoryPricing = ttsPricing[category];
  const modelFound = !!categoryPricing;

  const perKChars = categoryPricing?.[plan] ?? null;
  const totalCost = perKChars !== null ? (totalChars / 1000) * perKChars : null;

  return { totalChars, perKChars, totalCost, modelFound };
}

// --- Total cost ---

export function estimateTotalCost(
  llm: LlmCostEstimate,
  image: ImageCostEstimate,
  tts: TtsCostEstimate
): number | null {
  const llmCost = llm.totalCost;
  const imageCost = image.total ?? 0;
  const ttsCost = tts.totalCost ?? 0;

  // If both image and TTS are unknown, return null
  if (image.total === null && tts.totalCost === null) {
    return llmCost;
  }

  return llmCost + imageCost + ttsCost;
}

// Re-export for use in llm.ts calculateCost
export { llmPricing as LLM_PRICING };
