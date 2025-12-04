import React from 'react';
import { GithubIcon } from './icons/GithubIcon';
import { SaveIcon } from './icons/SaveIcon';
import { Spinner } from './Spinner';

interface HeaderProps {
  onNewPaper: () => void;
  onSave: () => void;
  onImprove: () => void;
  repoUrl: string;
  isLoading: boolean;
  isEditing: boolean;
  onCancelEditing: () => void;
  isPaperLoaded: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onNewPaper, onSave, onImprove, repoUrl, isEditing, onCancelEditing, isPaperLoaded }) => {
  return (
    <header className="bg-white shadow-md sticky top-0 z-10 font-sans">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">
            PI: <span className="text-blue-600">Paper Incubator</span>
            </h1>
            {repoUrl && (
                <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-2 mt-1 transition-colors">
                    <GithubIcon className="w-4 h-4" />
                    <span>{repoUrl.replace('https://github.com/', '')}</span>
                </a>
            )}
        </div>
        <div className="flex items-center gap-4">
            <p className={`text-sm text-gray-600 ${isEditing ? 'animate-pulse' : ''}`}>{status}</p>
            {isEditing ? (
                <button
                  onClick={onCancelEditing}
                  className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                  <Spinner />
                  <span>Cancel Editing</span>
              </button>
            ) : (
              <>
                <button
                  onClick={onSave}
                  disabled={!isPaperLoaded}
                  className="p-2 rounded-full text-gray-600 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                  title="Save paper as Markdown"
                >
                  <SaveIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={onImprove}
                    disabled={!isPaperLoaded}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Run a global improvement pass on the paper"
                >
                    Improve
                </button>
                <button
                  onClick={onNewPaper}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  New Paper
                </button>
              </>
            )}
        </div>
      </div>
    </header>
  );
};