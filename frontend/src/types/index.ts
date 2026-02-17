// Configuration
export interface ConfigState {
  apiKeys: {
    openai: string | null;
    deepseek: string | null;
    google: string | null;
    elevenLabs: string;
  };
  llm: {
    provider: 'openai' | 'deepseek';
    model: string;
  };
  video: {
    resolution: { width: number; height: number };
    frameRate: number;
    numScenes: number;
    targetDuration: number;
  };
  image: {
    provider: 'openai' | 'google';
    model: string;
    quality: 'low' | 'medium' | 'high';
    aspectRatio?: string;
  };
  tts: {
    model: string;
    voiceId: string;
    speed: number;
    concurrency: number;
    plan: 'free' | 'starter' | 'creator' | 'pro' | 'scale' | 'business';
  };
  temperature: number;
}

// Scene
export interface Scene {
  id: string;
  index: number;
  script: string;
  imageDescription: string;
  isEdited: boolean;
}

export interface SceneState {
  scenes: Scene[];
  isStreaming: boolean;
  streamBuffer: string;
}

// Asset
export type AssetStatus = 'pending' | 'generating' | 'complete' | 'failed';
export type AssetType = 'image' | 'audio';

export interface Asset {
  id: string;
  sceneId: string;
  type: AssetType;
  status: AssetStatus;
  data: Blob | null;
  dataUrl: string | null;
  duration: number | null;
  error: string | null;
  retryCount: number;
}

export interface AudioTiming {
  assetId: string;
  words: Array<{ word: string; start: number; end: number }>;
  totalDuration: number;
}

export interface AssetState {
  assets: Map<string, Asset>;
  timings: Map<string, AudioTiming>;
  generationQueue: string[];
}

// Workflow
export type WorkflowStage = 'config' | 'scenes' | 'assets' | 'assembly' | 'output';

export interface WorkflowState {
  isGenerating: boolean;
  error: string | null;
  tokenUsage: { prompt: number; completion: number } | null;
  estimatedCost: number | null;
  finalVideo: Blob | null;
}
