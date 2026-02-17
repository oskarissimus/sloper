import { useWorkflow } from '../../contexts/WorkflowContext';
import { useScenes } from '../../contexts/SceneContext';
import { useAssets } from '../../contexts/AssetContext';
import { PromptInput } from './PromptInput';
import { SceneList } from './SceneList';
import { TokenUsageDisplay } from './TokenUsageDisplay';

function GenerateAssetsButton() {
  const { scenes, isStreaming } = useScenes();
  const { setStage } = useWorkflow();
  const { createAsset, clearAssets } = useAssets();

  const handleClick = () => {
    // Clear any existing assets and create new entries for each scene
    clearAssets();
    scenes.forEach((scene) => {
      createAsset(scene.id, 'image');
      createAsset(scene.id, 'audio');
    });
    setStage('assets');
  };

  const validScenes = scenes.filter(
    (s) => s.script.trim() && s.imageDescription.trim()
  );
  const isDisabled = validScenes.length === 0 || isStreaming;

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Generate Assets ({validScenes.length} scenes)
      </button>
      {scenes.length > 0 && validScenes.length < scenes.length && (
        <p className="text-sm text-amber-600 text-center">
          {scenes.length - validScenes.length} scene(s) have empty fields and will be skipped
        </p>
      )}
    </div>
  );
}

function BackToConfigButton() {
  const { setStage } = useWorkflow();

  return (
    <button
      onClick={() => setStage('config')}
      className="text-gray-600 hover:text-gray-800 transition-colors"
    >
      ← Back to Configuration
    </button>
  );
}

export function SceneGenerationScreen() {
  const { error } = useWorkflow();
  const { scenes, isStreaming } = useScenes();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Generate Scenes</h1>
          <p className="mt-1 text-gray-600">
            Enter a topic and generate scenes for your video.
          </p>
        </div>
        <BackToConfigButton />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <PromptInput />
      </div>

      {isStreaming && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <svg
            className="animate-spin h-5 w-5 text-blue-600"
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
          <span className="text-blue-700">
            Generating scenes... ({scenes.length} received so far)
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <SceneList />

      {scenes.length > 0 && !isStreaming && (
        <div className="space-y-4">
          <TokenUsageDisplay />
          <GenerateAssetsButton />
        </div>
      )}
    </div>
  );
}
