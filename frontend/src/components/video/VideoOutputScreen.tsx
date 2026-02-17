import { useWorkflow } from '../../contexts/WorkflowContext';
import { VideoPlayer } from './VideoPlayer';
import { DownloadButton } from './DownloadButton';
import { GoogleDriveButton } from './GoogleDriveButton';

export function VideoOutputScreen() {
  const { stage, finalVideo, reset } = useWorkflow();

  if (stage !== 'output' || !finalVideo) return null;

  const handleStartOver = () => {
    const confirmed = window.confirm(
      'Start a new video? This will clear all current progress.'
    );
    if (confirmed) {
      reset();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Video is Ready!
        </h1>
        <p className="text-gray-600">
          Preview your video below and download when you're ready.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-4">
        <VideoPlayer video={finalVideo} />
      </div>

      <div className="flex justify-between items-center bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-3">
          <DownloadButton video={finalVideo} />
          <GoogleDriveButton video={finalVideo} />
        </div>

        <button
          onClick={handleStartOver}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Start New Video
        </button>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
        <p>
          <strong>Tip:</strong> The video is ready to share on social media
          platforms. For best results on YouTube Shorts, TikTok, or Instagram
          Reels, ensure your aspect ratio matches the platform's requirements.
        </p>
      </div>
    </div>
  );
}
