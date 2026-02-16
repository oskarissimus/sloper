import { useCallback, useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { useScenes } from '../contexts/SceneContext';
import { useAssets } from '../contexts/AssetContext';
import {
  generateImage,
  generateGoogleImage,
  deriveAspectRatio,
  processImage,
  imageLimiter,
} from '../services/images';
import {
  generateTtsAudio,
  ttsLimiter,
} from '../services/tts';

interface GenerationProgress {
  imagesTotal: number;
  imagesComplete: number;
  imagesFailed: number;
  audioTotal: number;
  audioComplete: number;
  audioFailed: number;
}

export function useAssetGeneration() {
  const { config } = useConfig();
  const { scenes } = useScenes();
  const { assets, updateAssetStatus, setAssetData, setTiming, getAssetsByScene } = useAssets();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    imagesTotal: 0,
    imagesComplete: 0,
    imagesFailed: 0,
    audioTotal: 0,
    audioComplete: 0,
    audioFailed: 0,
  });

  const generateImages = useCallback(async () => {
    const { width, height } = config.video.resolution;
    const size = `${width}x${height}`;
    const total = scenes.length;
    const isGoogle = config.image.provider === 'google';

    setProgress((prev) => ({ ...prev, imagesTotal: total, imagesComplete: 0, imagesFailed: 0 }));

    const tasks = scenes.map((scene) => {
      const { image } = getAssetsByScene(scene.id);
      if (!image || !scene.imageDescription.trim()) {
        return Promise.resolve();
      }

      return imageLimiter.add(async () => {
        updateAssetStatus(image.id, 'generating');

        try {
          let result;

          if (isGoogle) {
            const aspectRatio = config.image.aspectRatio || deriveAspectRatio(width, height);
            result = await generateGoogleImage(config.apiKeys.google ?? '', {
              prompt: scene.imageDescription,
              model: config.image.model,
              aspectRatio,
            });
          } else {
            result = await generateImage(config.apiKeys.openai ?? '', {
              prompt: scene.imageDescription,
              model: config.image.model,
              quality: config.image.quality,
              size,
            });
          }

          // Process image (flatten transparency, correct brightness)
          const processed = await processImage(result.dataUrl, result.data);

          // Update asset with final data
          setAssetData(image.id, processed.data, processed.dataUrl);

          setProgress((prev) => ({
            ...prev,
            imagesComplete: prev.imagesComplete + 1,
          }));

          return processed;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Image generation failed';
          updateAssetStatus(image.id, 'failed', message);

          setProgress((prev) => ({
            ...prev,
            imagesFailed: prev.imagesFailed + 1,
          }));

          throw error;
        }
      });
    });

    await Promise.allSettled(tasks);
  }, [config, scenes, getAssetsByScene, updateAssetStatus, setAssetData]);

  const generateAudio = useCallback(async () => {
    const total = scenes.length;

    setProgress((prev) => ({ ...prev, audioTotal: total, audioComplete: 0, audioFailed: 0 }));

    // Generate audio with context (previous/next scene scripts)
    const tasks = scenes.map((scene, index) => {
      const { audio } = getAssetsByScene(scene.id);
      if (!audio || !scene.script.trim()) {
        return Promise.resolve();
      }

      const previousText = index > 0 ? scenes[index - 1].script : undefined;
      const nextText = index < scenes.length - 1 ? scenes[index + 1].script : undefined;

      return ttsLimiter.add(async () => {
        updateAssetStatus(audio.id, 'generating');

        try {
          const result = await generateTtsAudio(config.apiKeys.elevenLabs, {
            text: scene.script,
            voiceId: config.tts.voiceId,
            model: config.tts.model,
            speed: config.tts.speed,
            previousText,
            nextText,
          });

          // Update asset with audio data
          setAssetData(audio.id, result.data, result.dataUrl, result.duration);

          // Store timing data if available
          if (result.timing) {
            setTiming(audio.id, {
              assetId: audio.id,
              words: result.timing.words,
              totalDuration: result.timing.totalDuration,
            });
          }

          setProgress((prev) => ({
            ...prev,
            audioComplete: prev.audioComplete + 1,
          }));

          return result;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Audio generation failed';
          updateAssetStatus(audio.id, 'failed', message);

          setProgress((prev) => ({
            ...prev,
            audioFailed: prev.audioFailed + 1,
          }));

          throw error;
        }
      });
    });

    await Promise.allSettled(tasks);
  }, [config, scenes, getAssetsByScene, updateAssetStatus, setAssetData, setTiming]);

  const generateAllAssets = useCallback(async () => {
    setIsGenerating(true);

    try {
      // Generate images and audio in parallel
      await Promise.all([generateImages(), generateAudio()]);
    } finally {
      setIsGenerating(false);
    }
  }, [generateImages, generateAudio]);

  const retryAsset = useCallback(
    async (assetId: string) => {
      const asset = assets.get(assetId);
      if (!asset) return;

      const scene = scenes.find((s) => s.id === asset.sceneId);
      if (!scene) return;

      updateAssetStatus(assetId, 'generating');

      try {
        if (asset.type === 'image') {
          const { width, height } = config.video.resolution;
          const size = `${width}x${height}`;
          let result;

          if (config.image.provider === 'google') {
            const aspectRatio = config.image.aspectRatio || deriveAspectRatio(width, height);
            result = await generateGoogleImage(config.apiKeys.google ?? '', {
              prompt: scene.imageDescription,
              model: config.image.model,
              aspectRatio,
            });
          } else {
            result = await generateImage(config.apiKeys.openai ?? '', {
              prompt: scene.imageDescription,
              model: config.image.model,
              quality: config.image.quality,
              size,
            });
          }

          const processed = await processImage(result.dataUrl, result.data);
          setAssetData(assetId, processed.data, processed.dataUrl);
        } else {
          const sceneIndex = scenes.findIndex((s) => s.id === scene.id);
          const previousText = sceneIndex > 0 ? scenes[sceneIndex - 1].script : undefined;
          const nextText = sceneIndex < scenes.length - 1 ? scenes[sceneIndex + 1].script : undefined;

          const result = await generateTtsAudio(config.apiKeys.elevenLabs, {
            text: scene.script,
            voiceId: config.tts.voiceId,
            model: config.tts.model,
            speed: config.tts.speed,
            previousText,
            nextText,
          });

          setAssetData(assetId, result.data, result.dataUrl, result.duration);

          if (result.timing) {
            setTiming(assetId, {
              assetId,
              words: result.timing.words,
              totalDuration: result.timing.totalDuration,
            });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Retry failed';
        updateAssetStatus(assetId, 'failed', message);
      }
    },
    [config, scenes, assets, updateAssetStatus, setAssetData, setTiming]
  );

  return {
    isGenerating,
    progress,
    generateImages,
    generateAudio,
    generateAllAssets,
    retryAsset,
  };
}
