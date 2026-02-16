import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { ConfigState } from '../types';

const STORAGE_KEY = 'sloper-api-config';

// Default configuration values per FR-008
const defaultConfig: ConfigState = {
  apiKeys: {
    openai: null,
    deepseek: null,
    google: null,
    elevenLabs: '',
  },
  llm: {
    provider: 'openai',
    model: '',  // Will be set after API key is entered and models are fetched
  },
  video: {
    resolution: { width: 1024, height: 1536 },
    frameRate: 24,
    numScenes: 18,
    targetDuration: 180,
  },
  image: {
    provider: 'openai',
    model: 'gpt-image-1',
    quality: 'low',
  },
  tts: {
    model: 'eleven_multilingual_v2',
    voiceId: 'Bx2lBwIZJBilRBVc3AGO',
    speed: 1.1,
    concurrency: 4,
  },
  temperature: 0.7,
};

function loadPersistedConfig(): ConfigState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultConfig;
    const parsed = JSON.parse(stored);
    return {
      ...defaultConfig,
      apiKeys: { ...defaultConfig.apiKeys, ...parsed.apiKeys },
      llm: { ...defaultConfig.llm, provider: parsed.llm?.provider ?? defaultConfig.llm.provider },
      image: { ...defaultConfig.image, provider: parsed.image?.provider ?? defaultConfig.image.provider },
    };
  } catch {
    return defaultConfig;
  }
}

interface ConfigContextType {
  config: ConfigState;
  updateApiKeys: (keys: Partial<ConfigState['apiKeys']>) => void;
  updateLlm: (llm: Partial<ConfigState['llm']>) => void;
  updateVideo: (video: Partial<ConfigState['video']>) => void;
  updateImage: (image: Partial<ConfigState['image']>) => void;
  updateTts: (tts: Partial<ConfigState['tts']>) => void;
  updateTemperature: (temperature: number) => void;
  resetConfig: () => void;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

interface ConfigProviderProps {
  children: ReactNode;
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const [config, setConfig] = useState<ConfigState>(loadPersistedConfig);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        apiKeys: config.apiKeys,
        llm: { provider: config.llm.provider },
        image: { provider: config.image.provider },
      }));
    } catch {
      // localStorage may be unavailable (e.g. private browsing)
    }
  }, [config.apiKeys, config.llm.provider, config.image.provider]);

  const updateApiKeys = useCallback((keys: Partial<ConfigState['apiKeys']>) => {
    setConfig((prev) => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, ...keys },
    }));
  }, []);

  const updateLlm = useCallback((llm: Partial<ConfigState['llm']>) => {
    setConfig((prev) => ({
      ...prev,
      llm: { ...prev.llm, ...llm },
    }));
  }, []);

  const updateVideo = useCallback((video: Partial<ConfigState['video']>) => {
    setConfig((prev) => ({
      ...prev,
      video: { ...prev.video, ...video },
    }));
  }, []);

  const updateImage = useCallback((image: Partial<ConfigState['image']>) => {
    setConfig((prev) => ({
      ...prev,
      image: { ...prev.image, ...image },
    }));
  }, []);

  const updateTts = useCallback((tts: Partial<ConfigState['tts']>) => {
    setConfig((prev) => ({
      ...prev,
      tts: { ...prev.tts, ...tts },
    }));
  }, []);

  const updateTemperature = useCallback((temperature: number) => {
    setConfig((prev) => ({
      ...prev,
      temperature,
    }));
  }, []);

  const resetConfig = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    setConfig(defaultConfig);
  }, []);

  const value = useMemo(
    () => ({
      config,
      updateApiKeys,
      updateLlm,
      updateVideo,
      updateImage,
      updateTts,
      updateTemperature,
      resetConfig,
    }),
    [config, updateApiKeys, updateLlm, updateVideo, updateImage, updateTts, updateTemperature, resetConfig]
  );

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextType {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
