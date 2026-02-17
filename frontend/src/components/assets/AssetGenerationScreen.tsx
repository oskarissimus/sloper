import { useEffect, useRef } from 'react';
import { useWorkflow } from '../../contexts/WorkflowContext';
import { useScenes } from '../../contexts/SceneContext';
import { useAssets } from '../../contexts/AssetContext';
import { useAssetGeneration } from '../../hooks/useAssetGeneration';
import { AssetProgressCard } from './AssetProgressCard';
import { OverallProgress } from './OverallProgress';

function AssembleVideoButton() {
  const { setStage } = useWorkflow();
  const { assets } = useAssets();

  const assetArray = Array.from(assets.values());
  const allComplete = assetArray.length > 0 && assetArray.every((a) => a.status === 'complete');
  const hasFailed = assetArray.some((a) => a.status === 'failed');
  const isGenerating = assetArray.some((a) => a.status === 'generating');

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      {hasFailed && !isGenerating && (
        <p className="text-amber-600 text-sm">
          Some assets failed to generate. You can retry them individually or proceed with the successful ones.
        </p>
      )}
      <button
        onClick={() => setStage('assembly')}
        disabled={!allComplete && !hasFailed}
        className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating
          ? 'Generating assets...'
          : allComplete
            ? 'Assemble Video'
            : hasFailed
              ? 'Proceed with Available Assets'
              : 'Waiting for assets...'}
      </button>
    </div>
  );
}

function BackToScenesButton() {
  const { setStage } = useWorkflow();

  return (
    <button
      onClick={() => setStage('scenes')}
      className="text-gray-600 hover:text-gray-800 transition-colors"
    >
      ← Back to Scenes
    </button>
  );
}

export function AssetGenerationScreen() {
  const { isGenerating: workflowGenerating, setIsGenerating } = useWorkflow();
  const { scenes } = useScenes();
  const { assets, getAssetsByScene } = useAssets();
  const { isGenerating, progress, generateAllAssets, retryAsset } = useAssetGeneration();
  const hasStartedRef = useRef(false);

  // Auto-start generation on mount
  useEffect(() => {
    if (!hasStartedRef.current && scenes.length > 0) {
      hasStartedRef.current = true;
      setIsGenerating(true);
      generateAllAssets().finally(() => {
        setIsGenerating(false);
      });
    }
  }, [scenes.length, generateAllAssets, setIsGenerating]);

  // Calculate totals from assets
  const assetArray = Array.from(assets.values());
  const totalAssets = assetArray.length;
  const completedAssets = assetArray.filter((a) => a.status === 'complete').length;
  const failedAssets = assetArray.filter((a) => a.status === 'failed').length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Generating Assets</h1>
          <p className="mt-1 text-gray-600">
            Creating images and audio for {scenes.length} scenes
          </p>
        </div>
        <BackToScenesButton />
      </div>

      <OverallProgress
        total={totalAssets}
        completed={completedAssets}
        failed={failedAssets}
        isGenerating={isGenerating || workflowGenerating}
      />

      {/* Progress details */}
      {(isGenerating || workflowGenerating) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-900">Images:</span>{' '}
              <span className="text-blue-700">
                {progress.imagesComplete} / {progress.imagesTotal}
                {progress.imagesFailed > 0 && (
                  <span className="text-red-600 ml-1">({progress.imagesFailed} failed)</span>
                )}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-900">Audio:</span>{' '}
              <span className="text-blue-700">
                {progress.audioComplete} / {progress.audioTotal}
                {progress.audioFailed > 0 && (
                  <span className="text-red-600 ml-1">({progress.audioFailed} failed)</span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Scene asset cards */}
      <div className="space-y-4">
        {scenes.map((scene, index) => (
          <AssetProgressCard
            key={scene.id}
            scene={scene}
            index={index}
            assets={getAssetsByScene(scene.id)}
            onRetry={retryAsset}
          />
        ))}
      </div>

      {/* Assemble button */}
      {!isGenerating && !workflowGenerating && completedAssets > 0 && (
        <AssembleVideoButton />
      )}
    </div>
  );
}
