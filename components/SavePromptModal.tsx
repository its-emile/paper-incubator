import React from 'react';

interface SavePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndContinue: () => void;
  onContinueWithoutSaving: () => void;
}

export const SavePromptModal: React.FC<SavePromptModalProps> = ({ isOpen, onClose, onSaveAndContinue, onContinueWithoutSaving }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-sans" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Save Current Paper?</h2>
        <p className="text-gray-600 mb-6">Would you like to save your current work as a Markdown file before starting a new paper?</p>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onContinueWithoutSaving} className="px-6 py-2 rounded-lg text-white font-semibold bg-orange-600 hover:bg-orange-700 transition-colors">
            Don't Save
          </button>
          <button type="button" onClick={onSaveAndContinue} className="px-6 py-2 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700 transition-colors">
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
};