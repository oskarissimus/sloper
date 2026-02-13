import { useEffect, useRef, useState } from 'react';
import { useWorkflow } from '../../contexts/WorkflowContext';
import { useConfig } from '../../contexts/ConfigContext';
import { useScenes } from '../../contexts/SceneContext';
import { useAssets } from '../../contexts/AssetContext';
import { assembleVideo, getBackendUrl } from '../../services/video';

type AssemblyStatus = 'preparing' | 'uploading' | 'processing' | 'done' | 'error';

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

function ElapsedTimer() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <p className="text-sm text-gray-400">
      Elapsed: {minutes}:{seconds.toString().padStart(2, '0')}
    </p>
  );
}

function BackToAssetsButton() {
  const { setStage } = useWorkflow();

  return (
    <button
      onClick={() => setStage('assets')}
      className="text-gray-600 hover:text-gray-800 transition-colors"
    >
      ← Back to Assets
    </button>
  );
}

export function VideoAssemblyScreen() {
  const { stage, setStage, setFinalVideo, setIsGenerating, setError } = useWorkflow();
  const { config } = useConfig();
  const { scenes } = useScenes();
  const { assets, timings } = useAssets();
  const [status, setStatus] = useState<AssemblyStatus>('preparing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadSizeMB, setUploadSizeMB] = useState<string>('');
  const hasStartedRef = useRef(false);
  const prevStageRef = useRef(stage);

  useEffect(() => {
    // Reset when stage changes away from assembly
    if (prevStageRef.current === 'assembly' && stage !== 'assembly') {
      hasStartedRef.current = false;
      setStatus('preparing');
    }
    prevStageRef.current = stage;

    // Start assembly when entering assembly stage
    if (stage === 'assembly' && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startAssembly();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const startAssembly = async () => {
    setIsGenerating(true);
    setStatus('preparing');

    try {
      // Gather assets in scene order
      const images: Blob[] = [];
      const audioFiles: Blob[] = [];
      const sceneMetadata: Array<{ index: number; imageDuration: number }> = [];

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];

        // Find image and audio assets for this scene
        const imageAsset = Array.from(assets.values()).find(
          (a) => a.sceneId === scene.id && a.type === 'image'
        );
        const audioAsset = Array.from(assets.values()).find(
          (a) => a.sceneId === scene.id && a.type === 'audio'
        );

        if (!imageAsset?.data || !audioAsset?.data) {
          throw new Error(`Missing assets for scene ${i + 1}`);
        }

        images.push(imageAsset.data);
        audioFiles.push(audioAsset.data);

        // Get duration from timing or asset
        const timing = timings.get(audioAsset.id);
        const duration = timing?.totalDuration || audioAsset.duration || 10;

        sceneMetadata.push({
          index: i,
          imageDuration: duration,
        });
      }

      // Calculate total upload size
      const totalBytes = [...images, ...audioFiles].reduce((sum, b) => sum + b.size, 0);
      setUploadSizeMB(formatMB(totalBytes));

      setStatus('uploading');

      const backendUrl = getBackendUrl();
      const result = await assembleVideo(
        backendUrl,
        {
          scenes: sceneMetadata,
          resolution: config.video.resolution,
          frameRate: config.video.frameRate,
        },
        images,
        audioFiles
      );

      setStatus('done');
      setFinalVideo(result.video);
      setStage('output');
    } catch (error) {
      setStatus('error');
      const message = error instanceof Error ? error.message : 'Assembly failed';
      setErrorMessage(message);
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (stage !== 'assembly') return null;

  const statusMessages: Record<AssemblyStatus, string> = {
    preparing: 'Preparing assets for upload...',
    uploading: uploadSizeMB
      ? `Uploading ${uploadSizeMB} MB to assembly server...`
      : 'Uploading to assembly server...',
    processing: 'Processing video with FFmpeg...',
    done: 'Complete! Redirecting...',
    error: 'Assembly failed',
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Assembling Video</h1>
        <BackToAssetsButton />
      </div>

      <div className="bg-white rounded-lg shadow p-8 flex flex-col items-center justify-center min-h-[300px]">
        {status !== 'error' ? (
          <>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6" />

            <p className="text-lg text-gray-700 mb-2">{statusMessages[status]}</p>

            <ElapsedTimer />

            <p className="text-sm text-gray-500 mt-4 text-center">
              This may take a few minutes depending on the number of scenes and video length.
            </p>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-lg text-red-600 mb-2">Video assembly failed</p>
            {errorMessage && (
              <p className="text-sm text-red-500 mb-4 max-w-md">{errorMessage}</p>
            )}
            <button
              onClick={() => {
                hasStartedRef.current = false;
                startAssembly();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry Assembly
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
