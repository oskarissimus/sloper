import { useConfig } from '../../contexts/ConfigContext';

const RESOLUTIONS = [
  { label: '1024x1536 (Portrait)', width: 1024, height: 1536 },
  { label: '1920x1080 (Landscape 16:9)', width: 1920, height: 1080 },
  { label: '1080x1920 (Portrait HD)', width: 1080, height: 1920 },
  { label: '1280x720 (HD 720p)', width: 1280, height: 720 },
];

export function VideoSettings() {
  const { config, updateVideo, updateTemperature } = useConfig();
  const { video, temperature } = config;

  const currentResolution = `${video.resolution.width}x${video.resolution.height}`;

  const handleResolutionChange = (value: string) => {
    const [width, height] = value.split('x').map(Number);
    updateVideo({ resolution: { width, height } });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Resolution
          </label>
          <select
            value={currentResolution}
            onChange={(e) => handleResolutionChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {RESOLUTIONS.map((r) => (
              <option key={`${r.width}x${r.height}`} value={`${r.width}x${r.height}`}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Frame Rate (FPS)
          </label>
          <input
            type="number"
            value={video.frameRate}
            onChange={(e) => updateVideo({ frameRate: parseInt(e.target.value) || 24 })}
            min={1}
            max={60}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Number of Scenes
          </label>
          <input
            type="number"
            value={video.numScenes}
            onChange={(e) => updateVideo({ numScenes: parseInt(e.target.value) || 1 })}
            min={1}
            max={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Target Duration (seconds)
          </label>
          <input
            type="number"
            value={video.targetDuration}
            onChange={(e) => updateVideo({ targetDuration: parseInt(e.target.value) || 60 })}
            min={10}
            max={3600}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Temperature: {temperature.toFixed(1)}
        </label>
        <input
          type="range"
          value={temperature}
          onChange={(e) => updateTemperature(parseFloat(e.target.value))}
          min={0}
          max={1}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Focused (0.0)</span>
          <span>Creative (1.0)</span>
        </div>
      </div>
    </div>
  );
}
