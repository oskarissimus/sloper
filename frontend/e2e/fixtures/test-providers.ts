export interface TestProviders {
  llm: {
    provider: string;
    model: string;
    apiKey: string;
  };
  image: {
    provider: string;
    model: string;
    apiKey: string;
  };
  tts: {
    apiKey: string;
  };
}

const LLM_PROVIDER_KEY_MAP: Record<string, string> = {
  openai: 'E2E_OPENAI_API_KEY',
  deepseek: 'E2E_DEEPSEEK_API_KEY',
};

const IMAGE_PROVIDER_KEY_MAP: Record<string, string> = {
  openai: 'E2E_OPENAI_API_KEY',
  nanoBanana: 'E2E_GOOGLE_API_KEY',
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}. Set it in .env.e2e or as an environment variable.`);
  }
  return value;
}

export function getTestProviders(): TestProviders {
  const llmProvider = process.env.E2E_LLM_PROVIDER || 'openai';
  const llmModel = process.env.E2E_LLM_MODEL || 'gpt-4o-mini';
  const imageProvider = process.env.E2E_IMAGE_PROVIDER || 'openai';
  const imageModel = process.env.E2E_IMAGE_MODEL || 'gpt-image-1';

  const llmKeyEnv = LLM_PROVIDER_KEY_MAP[llmProvider];
  if (!llmKeyEnv) {
    throw new Error(`Unknown LLM provider: ${llmProvider}. Supported: ${Object.keys(LLM_PROVIDER_KEY_MAP).join(', ')}`);
  }

  const imageKeyEnv = IMAGE_PROVIDER_KEY_MAP[imageProvider];
  if (!imageKeyEnv) {
    throw new Error(`Unknown image provider: ${imageProvider}. Supported: ${Object.keys(IMAGE_PROVIDER_KEY_MAP).join(', ')}`);
  }

  return {
    llm: {
      provider: llmProvider,
      model: llmModel,
      apiKey: requireEnv(llmKeyEnv),
    },
    image: {
      provider: imageProvider,
      model: imageModel,
      apiKey: requireEnv(imageKeyEnv),
    },
    tts: {
      apiKey: requireEnv('E2E_ELEVENLABS_API_KEY'),
    },
  };
}
