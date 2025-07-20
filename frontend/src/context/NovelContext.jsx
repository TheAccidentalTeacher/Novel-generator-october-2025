import { createContext, useContext, useReducer } from 'react';

const NovelContext = createContext();

const initialState = {
  job: null,
  currentPhase: null,
  progress: {
    outlineComplete: false,
    chaptersCompleted: 0,
    totalChapters: 0
  },
  outline: [],
  chapters: [],
  error: null,
  isLoading: false
};

function novelReducer(state, action) {
  switch (action.type) {
    case 'START_GENERATION':
      return { 
        ...state, 
        isLoading: true, 
        error: null, 
        job: action.payload 
      };
    case 'UPDATE_PROGRESS':
      return { 
        ...state, 
        isLoading: false, 
        ...action.payload 
      };
    case 'GENERATION_COMPLETE':
      return { 
        ...state, 
        isLoading: false, 
        ...action.payload 
      };
    case 'GENERATION_ERROR':
      return { 
        ...state, 
        isLoading: false, 
        error: action.payload 
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function NovelProvider({ children }) {
  const [state, dispatch] = useReducer(novelReducer, initialState);
  
  return (
    <NovelContext.Provider value={{ state, dispatch }}>
      {children}
    </NovelContext.Provider>
  );
}

export function useNovel() {
  return useContext(NovelContext);
}
