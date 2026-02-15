import { useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext';

type ImageProvider = 'openai' | 'nanoBanana';

const OPENAI_IMAGE_MODELS = [
  { id: 'gpt-image-1', name: 'GPT Image 1 (DALL-E 3)' },
  { id: 'dall-e-3', name: 'DALL-E 3' },
  { id: 'dall-e-2', name: 'DALL-E 2' },
];

const NANO_BANANA_MODELS = [
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' },
  { id: 'gemini-2.0-flash-preview-image-generation', name: 'Gemini 2.0 Flash Preview' },
];

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Low (faster, cheaper)' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High (slower, better quality)' },
];

const ASPECT_RATIOS = ['16:9', '9:16', '4:3', '3:4', '1:1'];

export function ImageProviderSelect() {
  const { config, updateImage, updateApiKeys } = useConfig();
  const { provider, model, quality, aspectRatio } = config.image;

  const [showApiKey, setShowApiKey] = useState(false);

  const apiKey =
    provider === 'openai' ? config.apiKeys.openai : config.apiKeys.google;
  const models =
    provider === 'openai' ? OPENAI_IMAGE_MODELS : NANO_BANANA_MODELS;

  const handleProviderChange = (newProvider: ImageProvider) => {
    const firstModel =
      newProvider === 'openai'
        ? OPENAI_IMAGE_MODELS[0].id
        : NANO_BANANA_MODELS[0].id;
    updateImage({ provider: newProvider, model: firstModel });
  };

  const handleApiKeyChange = (value: string) => {
    if (provider === 'openai') {
      updateApiKeys({ openai: value || null });
    } else {
      updateApiKeys({ google: value || null });
    }
  };

  const providerLabel = provider === 'openai' ? 'OpenAI' : 'Google';
  const placeholder = provider === 'openai' ? 'sk-...' : 'AIza...';

  return (
    <div className="space-y-4">
      {/* Provider Selection */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Image Provider
        </label>
        <select
          value={provider}
          onChange={(e) =>
            handleProviderChange(e.target.value as ImageProvider)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="openai">OpenAI (DALL-E)</option>
          <option value="nanoBanana">Nano Banana (Gemini)</option>
        </select>
      </div>

      {/* API Key Input */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {providerLabel} API Key <span className="text-red-500">*</span>
        </label>
        {provider === 'openai' && (
          <p className="text-xs text-gray-500">
            Shared with LLM settings when both use OpenAI.
          </p>
        )}
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
        <label className="block text-sm font-medium text-gray-700">
          Image Model
        </label>
        <select
          value={model}
          onChange={(e) => updateImage({ model: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Quality - OpenAI only */}
      {provider === 'openai' && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Image Quality
          </label>
          <select
            value={quality}
            onChange={(e) =>
              updateImage({
                quality: e.target.value as 'low' | 'medium' | 'high',
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {QUALITY_OPTIONS.map((q) => (
              <option key={q.value} value={q.value}>
                {q.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Aspect Ratio - Nano Banana only */}
      {provider === 'nanoBanana' && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Aspect Ratio
          </label>
          <p className="text-xs text-gray-500">
            If not set, derived from video resolution.
          </p>
          <select
            value={aspectRatio || ''}
            onChange={(e) =>
              updateImage({
                aspectRatio: e.target.value || undefined,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Auto (from video resolution)</option>
            {ASPECT_RATIOS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
