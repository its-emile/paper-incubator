import React, { useState, useEffect } from 'react';
import { INITIAL_REPO_URL } from '../constants';

interface RepoModalProps {
  onClose: () => void;
  onSubmit: (url: string, apiKey: string) => void;
  isInitialSetup?: boolean;
}

export const RepoModal: React.FC<RepoModalProps> = ({ onClose, onSubmit, isInitialSetup = false }) => {
  const [url, setUrl] = useState(isInitialSetup ? INITIAL_REPO_URL : '');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && apiKey.trim()) {
      onSubmit(url.trim(), apiKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-sans">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg m-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-gray-900">{isInitialSetup ? 'Welcome to PI' : 'Start New Paper'}</h2>
        <p className="text-gray-600 mb-6">{isInitialSetup ? 'To begin, please provide a public GitHub URL and your OpenAI API key.' : 'Enter the URL of a public GitHub repository and your OpenAI API key.'}</p>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g., https://github.com/user/repo"
                className="w-full bg-gray-50 text-gray-900 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus={!isInitialSetup}
            />
             <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="OpenAI API Key (e.g., sk-...)"
                className="w-full bg-gray-50 text-gray-900 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-4">
            {!isInitialSetup && (
                <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
                >
                Cancel
                </button>
            )}
            <button
              type="submit"
              className="px-6 py-2 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={!url.trim() || !apiKey.trim()}
            >
              Generate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};