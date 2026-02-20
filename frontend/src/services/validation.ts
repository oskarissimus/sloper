export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ModelFetchResult {
  success: boolean;
  models: string[];
  error?: string;
}

// Exclusion lists for filtering non-chat models
const OPENAI_EXCLUDED = [
  'whisper', 'tts', 'dall-e', 'embedding', 'moderation', 'babbage', 'davinci',
  'realtime', 'transcribe', 'diarize', 'search', 'audio', 'codex',
];
const DEEPSEEK_EXCLUDED = ['embedding'];

function filterAndSortModels(models: string[], excluded: string[]): string[] {
  return models
    .filter(id => !excluded.some(ex => id.toLowerCase().includes(ex)))
    .sort((a, b) => a.localeCompare(b));
}

export async function fetchOpenAiModels(apiKey: string, showAll = false): Promise<ModelFetchResult> {
  if (!apiKey || apiKey.trim() === '') {
    return { success: false, models: [], error: 'API key is required' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, models: [], error: 'Invalid OpenAI API key' };
      }
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        models: [],
        error: error.error?.message || `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const allModels = (data.data as { id: string }[]).map(m => m.id);
    const models = showAll
      ? allModels.sort((a, b) => a.localeCompare(b))
      : filterAndSortModels(allModels, OPENAI_EXCLUDED);

    return { success: true, models };
  } catch (err) {
    return {
      success: false,
      models: [],
      error: err instanceof Error ? err.message : 'Network error fetching models',
    };
  }
}

export async function fetchDeepSeekModels(apiKey: string, showAll = false): Promise<ModelFetchResult> {
  if (!apiKey || apiKey.trim() === '') {
    return { success: false, models: [], error: 'API key is required' };
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, models: [], error: 'Invalid DeepSeek API key' };
      }
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        models: [],
        error: error.error?.message || `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const allModels = (data.data as { id: string }[]).map(m => m.id);
    const models = showAll
      ? allModels.sort((a, b) => a.localeCompare(b))
      : filterAndSortModels(allModels, DEEPSEEK_EXCLUDED);

    return { success: true, models };
  } catch (err) {
    return {
      success: false,
      models: [],
      error: err instanceof Error ? err.message : 'Network error fetching models',
    };
  }
}

export async function fetchGeminiImageModels(apiKey: string): Promise<ModelFetchResult> {
  if (!apiKey || apiKey.trim() === '') {
    return { success: false, models: [], error: 'API key is required' };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { method: 'GET' },
    );

    if (!response.ok) {
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        return { success: false, models: [], error: 'Invalid Google API key' };
      }
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        models: [],
        error: error.error?.message || `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const models = (data.models as { name: string; supportedGenerationMethods?: string[] }[])
      .filter(m =>
        m.name.includes('image') && (
          m.supportedGenerationMethods?.includes('generateContent') ||
          m.supportedGenerationMethods?.includes('predict')
        )
      )
      .map(m => m.name.replace('models/', ''))
      .sort((a, b) => a.localeCompare(b));

    return { success: true, models };
  } catch (err) {
    return {
      success: false,
      models: [],
      error: err instanceof Error ? err.message : 'Network error fetching models',
    };
  }
}

export async function validateOpenAiKey(apiKey: string): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'API key is required' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid OpenAI API key' };
    }

    const error = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: error.error?.message || `API error: ${response.status}`,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Network error validating API key',
    };
  }
}

export async function validateDeepSeekKey(apiKey: string): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'DeepSeek API key is required' };
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid DeepSeek API key' };
    }

    const error = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: error.error?.message || `API error: ${response.status}`,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Network error validating API key',
    };
  }
}

export async function validateElevenLabsKey(apiKey: string): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'ElevenLabs API key is required' };
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid ElevenLabs API key' };
    }

    const error = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: error.detail?.message || error.message || `API error: ${response.status}`,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Network error validating API key',
    };
  }
}
