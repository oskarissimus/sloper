import { useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext';

export function ApiKeyInputs() {
  const { config, updateApiKeys } = useConfig();
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          ElevenLabs API Key <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={visible ? 'text' : 'password'}
            value={config.apiKeys.elevenLabs}
            onChange={(e) => updateApiKeys({ elevenLabs: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-16"
            placeholder="Your ElevenLabs API key"
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        API keys are saved in your browser's local storage.
      </p>
    </div>
  );
}
