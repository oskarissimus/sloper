import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from './contexts/ConfigContext';
import { SceneProvider } from './contexts/SceneContext';
import { AssetProvider } from './contexts/AssetContext';
import { WorkflowProvider, useWorkflow } from './contexts/WorkflowContext';
import { ConfigScreen } from './components/config';
import { SceneGenerationScreen } from './components/scenes';
import { AssetGenerationScreen } from './components/assets';
import { VideoAssemblyScreen, VideoOutputScreen } from './components/video';
import { ErrorBoundary, ToastProvider } from './components/ui';
import { useNavigationWarning } from './hooks/useNavigationWarning';

function AppContent() {
  const { isGenerating, stage } = useWorkflow();

  // Warn user before leaving during active generation
  useNavigationWarning(isGenerating);

  return (
    <>
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      <main
        id="main-content"
        className="min-h-screen bg-gray-100"
        tabIndex={-1}
        aria-label={`Current stage: ${stage}`}
      >
        <Routes>
          <Route path="/config" element={<ConfigScreen />} />
          <Route path="/scenes" element={<SceneGenerationScreen />} />
          <Route path="/assets" element={<AssetGenerationScreen />} />
          <Route path="/assembly" element={<VideoAssemblyScreen />} />
          <Route path="/output" element={<VideoOutputScreen />} />
          <Route path="*" element={<Navigate to="/config" replace />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <HashRouter>
          <ConfigProvider>
            <SceneProvider>
              <AssetProvider>
                <WorkflowProvider>
                  <AppContent />
                </WorkflowProvider>
              </AssetProvider>
            </SceneProvider>
          </ConfigProvider>
        </HashRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
