import { useState, useEffect, useCallback } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { fetchOpenAiModels, fetchDeepSeekModels } from '../../services/validation';

type Provider = 'openai' | 'deepseek';

interface FetchState {
  loading: boolean;
  models: string[];
  error: string | null;
}

export function LlmProviderSelect() {
  const { config, updateLlm, updateApiKeys } = useConfig();
  const { provider, model } = config.llm;

  const [showApiKey, setShowApiKey] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);
  const [fetchState, setFetchState] = useState<FetchState>({
    loading: false,
    models: [],
    error: null,
  });

  // Get the API key for the current provider
  const apiKey = provider === 'openai' ? config.apiKeys.openai : config.apiKeys.deepseek;

  // Fetch models when API key changes or showAllModels toggles
  const fetchModels = useCallback(async () => {
    const key = provider === 'openai' ? config.apiKeys.openai : config.apiKeys.deepseek;
    if (!key || key.trim() === '') {
      setFetchState({ loading: false, models: [], error: null });
      return;
    }

    setFetchState(prev => ({ ...prev, loading: true, error: null }));

    const result = provider === 'openai'
      ? await fetchOpenAiModels(key, showAllModels)
      : await fetchDeepSeekModels(key, showAllModels);

    if (result.success) {
      setFetchState({ loading: false, models: result.models, error: null });
      // Auto-select first model if current model is not in the list
      if (result.models.length > 0 && !result.models.includes(model)) {
        updateLlm({ model: result.models[0] });
      }
    } else {
      setFetchState({ loading: false, models: [], error: result.error || 'Failed to fetch models' });
    }
  }, [provider, config.apiKeys.openai, config.apiKeys.deepseek, showAllModels, model, updateLlm]);

  // Debounced fetch on API key change
  useEffect(() => {
    const timer = setTimeout(fetchModels, 500);
    return () => clearTimeout(timer);
  }, [fetchModels]);

  const handleProviderChange = (newProvider: Provider) => {
    updateLlm({ provider: newProvider, model: '' });
    setFetchState({ loading: false, models: [], error: null });
  };

  const handleApiKeyChange = (value: string) => {
    if (provider === 'openai') {
      updateApiKeys({ openai: value });
    } else {
      updateApiKeys({ deepseek: value || null });
    }
  };

  const providerLabel = provider === 'openai' ? 'OpenAI' : 'DeepSeek';
  const placeholder = provider === 'openai' ? 'sk-...' : 'sk-...';

  return (
    <div className="space-y-4">
      {/* Provider Selection */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          LLM Provider
        </label>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value as Provider)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="openai">OpenAI</option>
          <option value="deepseek">DeepSeek</option>
        </select>
      </div>

      {/* API Key Input */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {providerLabel} API Key <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey || ''}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-16"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
          >
            {showApiKey ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Model Selection */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Model
          </label>
          {fetchState.models.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={showAllModels}
                onChange={(e) => setShowAllModels(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show all models
            </label>
          )}
        </div>
        <select
          value={model}
          onChange={(e) => updateLlm({ model: e.target.value })}
          disabled={fetchState.loading || fetchState.models.length === 0}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {fetchState.loading ? (
            <option>Loading models...</option>
          ) : fetchState.models.length === 0 ? (
            <option>Enter API key first</option>
          ) : (
            fetchState.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))
          )}
        </select>
        {fetchState.error && (
          <p className="text-sm text-red-600">{fetchState.error}</p>
        )}
      </div>
    </div>
  );
}
