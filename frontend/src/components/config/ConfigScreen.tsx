import { useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { useWorkflow } from '../../contexts/WorkflowContext';
import { ApiKeyInputs } from './ApiKeyInputs';
import { LlmProviderSelect } from './LlmProviderSelect';
import { VideoSettings } from './VideoSettings';
import { TtsSettings } from './TtsSettings';
import { validateElevenLabsKey } from '../../services/validation';

export function ConfigScreen() {
  const { stage, setStage, setError } = useWorkflow();
  const { config } = useConfig();
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (stage !== 'config') return null;

  const canStart = () => {
    const { apiKeys, llm } = config;
    // Check required: selected provider's API key, a model, and ElevenLabs key
    const hasLlmKey = llm.provider === 'openai'
      ? (apiKeys.openai?.length ?? 0) > 0
      : (apiKeys.deepseek?.length ?? 0) > 0;
    const hasModel = llm.model.length > 0;
    const hasElevenLabsKey = apiKeys.elevenLabs.length > 0;
    return hasLlmKey && hasModel && hasElevenLabsKey;
  };

  const handleStartGeneration = async () => {
    setIsValidating(true);
    setValidationError(null);

    const { apiKeys } = config;

    try {
      // LLM key is already validated during model fetch
      // Just validate ElevenLabs key
      const ttsResult = await validateElevenLabsKey(apiKeys.elevenLabs);

      if (!ttsResult.valid) {
        setValidationError(ttsResult.error || 'ElevenLabs API key validation failed');
        setIsValidating(false);
        return;
      }

      // All valid - proceed to scenes stage
      setError(null);
      setStage('scenes');
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Validation failed'
      );
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuration</h1>
        <p className="mt-2 text-gray-600">
          Set up your API keys and video generation settings.
        </p>
      </div>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">LLM Settings</h2>
        <LlmProviderSelect />
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">TTS API Key</h2>
        <ApiKeyInputs />
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Video Settings</h2>
        <VideoSettings />
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">TTS Settings</h2>
        <TtsSettings />
      </section>

      {validationError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{validationError}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleStartGeneration}
          disabled={!canStart() || isValidating}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isValidating ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Validating...
            </span>
          ) : (
            'Start Generation'
          )}
        </button>
      </div>
    </div>
  );
}
