import { useGoogleDriveUpload } from '../../hooks/useGoogleDriveUpload';

interface GoogleDriveButtonProps {
  video: Blob;
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function DriveIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

export function GoogleDriveButton({ video }: GoogleDriveButtonProps) {
  const { status, progress, result, error, upload, reset } = useGoogleDriveUpload();

  if (!CLIENT_ID) return null;

  if (status === 'idle') {
    return (
      <button
        onClick={() => upload(video)}
        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-md"
      >
        <DriveIcon />
        Upload to Google Drive
      </button>
    );
  }

  if (status === 'loading-gis') {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-6 py-3 bg-emerald-400 text-white font-medium rounded-lg shadow-md cursor-not-allowed"
      >
        <Spinner />
        Loading...
      </button>
    );
  }

  if (status === 'authenticating') {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-6 py-3 bg-emerald-400 text-white font-medium rounded-lg shadow-md cursor-not-allowed"
      >
        <Spinner />
        Signing in...
      </button>
    );
  }

  if (status === 'uploading') {
    const percent = Math.round(progress * 100);
    return (
      <button
        disabled
        className="relative flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg shadow-md cursor-not-allowed overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-emerald-400 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
        <span className="relative flex items-center gap-2">
          <Spinner />
          Uploading {percent}%
        </span>
      </button>
    );
  }

  if (status === 'success' && result) {
    return (
      <div className="flex items-center gap-1">
        <a
          href={result.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-md"
        >
          <LinkIcon />
          Open in Google Drive
        </a>
        <button
          onClick={reset}
          className="p-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => upload(video)}
          title={error ?? undefined}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-md"
        >
          <DriveIcon />
          Upload Failed &mdash; Retry
        </button>
        <button
          onClick={reset}
          className="p-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    );
  }

  return null;
}
