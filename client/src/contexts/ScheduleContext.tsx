import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';
import type { GenerationResult, AnalyticsResult } from '@shared/schema';

export interface ScheduleState {
  result: GenerationResult | null;
  analytics: AnalyticsResult | null;
  isGenerating: boolean;
  error: string | null;
}

export type ScheduleAction =
  | { type: 'START_GENERATION' }
  | { type: 'GENERATION_SUCCESS'; payload: { result: GenerationResult; analytics: AnalyticsResult } }
  | { type: 'GENERATION_ERROR'; payload: string }
  | { type: 'CLEAR_SCHEDULE' };

const initialState: ScheduleState = {
  result: null,
  analytics: null,
  isGenerating: false,
  error: null,
};

function scheduleReducer(state: ScheduleState, action: ScheduleAction): ScheduleState {
  switch (action.type) {
    case 'START_GENERATION':
      return {
        ...state,
        isGenerating: true,
        error: null,
      };
    
    case 'GENERATION_SUCCESS':
      return {
        ...state,
        result: action.payload.result,
        analytics: action.payload.analytics,
        isGenerating: false,
        error: null,
      };
    
    case 'GENERATION_ERROR':
      return {
        ...state,
        isGenerating: false,
        error: action.payload,
      };
    
    case 'CLEAR_SCHEDULE':
      return initialState;
    
    default:
      return state;
  }
}

interface ScheduleContextType {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(scheduleReducer, initialState);

  return (
    <ScheduleContext.Provider value={{ state, dispatch }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within ScheduleProvider');
  }
  return context;
}
