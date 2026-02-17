import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { WorkflowStage } from '../types';

const VALID_STAGES: Set<string> = new Set(['config', 'scenes', 'assets', 'assembly', 'output']);

function stageFromPath(pathname: string): WorkflowStage {
  const segment = pathname.replace(/^\//, '').split('/')[0];
  if (VALID_STAGES.has(segment)) return segment as WorkflowStage;
  return 'config';
}

interface WorkflowContextType {
  stage: WorkflowStage;
  isGenerating: boolean;
  error: string | null;
  tokenUsage: { prompt: number; completion: number } | null;
  estimatedCost: number | null;
  finalVideo: Blob | null;
  setStage: (stage: WorkflowStage) => void;
  setIsGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  setTokenUsage: (usage: { prompt: number; completion: number }) => void;
  setEstimatedCost: (cost: number) => void;
  setFinalVideo: (video: Blob) => void;
  reset: () => void;
}

const WorkflowContext = createContext<WorkflowContextType | null>(null);

interface WorkflowProviderProps {
  children: ReactNode;
}

export function WorkflowProvider({ children }: WorkflowProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const stage = stageFromPath(location.pathname);

  const [isGenerating, setIsGeneratingState] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const [tokenUsage, setTokenUsageState] = useState<{ prompt: number; completion: number } | null>(null);
  const [estimatedCost, setEstimatedCostState] = useState<number | null>(null);
  const [finalVideo, setFinalVideoState] = useState<Blob | null>(null);

  const setStage = useCallback(
    (s: WorkflowStage) => navigate('/' + s),
    [navigate]
  );

  const setIsGenerating = useCallback((generating: boolean) => {
    setIsGeneratingState(generating);
  }, []);

  const setError = useCallback((err: string | null) => {
    setErrorState(err);
  }, []);

  const setTokenUsage = useCallback((usage: { prompt: number; completion: number }) => {
    setTokenUsageState(usage);
  }, []);

  const setEstimatedCost = useCallback((cost: number) => {
    setEstimatedCostState(cost);
  }, []);

  const setFinalVideo = useCallback((video: Blob) => {
    setFinalVideoState(video);
  }, []);

  const reset = useCallback(() => {
    setIsGeneratingState(false);
    setErrorState(null);
    setTokenUsageState(null);
    setEstimatedCostState(null);
    setFinalVideoState(null);
    navigate('/config');
  }, [navigate]);

  const value = useMemo(
    () => ({
      stage,
      isGenerating,
      error,
      tokenUsage,
      estimatedCost,
      finalVideo,
      setStage,
      setIsGenerating,
      setError,
      setTokenUsage,
      setEstimatedCost,
      setFinalVideo,
      reset,
    }),
    [stage, isGenerating, error, tokenUsage, estimatedCost, finalVideo, setStage, setIsGenerating, setError, setTokenUsage, setEstimatedCost, setFinalVideo, reset]
  );

  return (
    <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
  );
}

export function useWorkflow(): WorkflowContextType {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
