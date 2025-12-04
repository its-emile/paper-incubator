import { useState, useEffect, useCallback } from 'react';
import type { Paper } from '../types';

const LOCAL_STORAGE_KEY = 'pi-paper-state';

export const usePaperState = () => {
  const [paper, setPaperInternal] = useState<Paper | null>(() => {
    try {
      const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    // FIX: Added curly braces to the catch block to fix syntax error.
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      if (paper) {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(paper));
      } else {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
    }
  }, [paper]);

  // FIX: Updated the type of newPaper to allow null, enabling paper state to be cleared.
  // FIX: Allow `setPaper` to accept a function updater, resolving type errors in App.tsx.
  const setPaper = useCallback((newPaper: Paper | null | ((prevState: Paper | null) => Paper | null)) => {
    setPaperInternal(newPaper);
  }, []);

  const clearPaper = useCallback(() => {
    setPaperInternal(null);
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, []);
  
  return { paper, setPaper, isLoading, setIsLoading, clearPaper };
};