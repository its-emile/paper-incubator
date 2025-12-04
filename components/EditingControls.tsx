import React, { useState } from 'react';
import type { EditingOptions } from '../types';
import { EDITING_OPTIONS_MAP } from '../constants';

interface EditingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRunEdit: (options: EditingOptions) => void;
    title?: string;
}

export const EditingModal: React.FC<EditingModalProps> = ({ isOpen, onClose, onRunEdit, title = "Improve Subsection" }) => {
    const [options, setOptions] = useState<EditingOptions>({
        formatting: true,
        style: true,
        depth: false,
        rigor: false,
        hastyStatements: true,
        coherence: true,
        redundancy: true,
        references: false,
    });
    const [customInstruction, setCustomInstruction] = useState('');

    if (!isOpen) return null;

    const handleCheckboxChange = (optionKey: keyof EditingOptions) => {
        setOptions(prev => ({ ...prev, [optionKey]: !prev[optionKey] }));
    };

    const handleRunClick = () => {
        onRunEdit({ ...options, customInstruction });
    };

    const hasSelectedOptions = Object.values(options).some(v => v) || customInstruction.trim() !== '';

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-sans"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white p-8 rounded-lg shadow-2xl border border-gray-200 w-full max-w-md m-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
                <p className="text-gray-600 mb-6">Select the criteria for the AI to focus on for this editing round.</p>
                
                <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-3 font-semibold">Focus Areas:</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {EDITING_OPTIONS_MAP.map(({ key, label }) => (
                            <label key={key} className="flex items-center space-x-2 text-sm cursor-pointer text-gray-700 hover:text-black">
                                <input
                                    type="checkbox"
                                    // FIX: The value for `checked` must be a boolean. The original expression could evaluate to a string, causing a type error.
                                    // Using the double negation `!!` correctly coerces any value to a boolean.
                                    checked={!!options[key as keyof EditingOptions]}
                                    onChange={() => handleCheckboxChange(key as keyof EditingOptions)}
                                    className="form-checkbox h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span>{label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="mb-6">
                    <label htmlFor="custom-instruction" className="block text-sm font-semibold text-gray-600 mb-2">Or, provide specific instructions:</label>
                    <textarea
                        id="custom-instruction"
                        value={customInstruction}
                        onChange={(e) => setCustomInstruction(e.target.value)}
                        placeholder="e.g., Make it sound more confident."
                        className="w-full bg-gray-50 text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                    />
                </div>

                <div className="flex justify-end items-center gap-4 mt-8">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRunClick}
                        disabled={!hasSelectedOptions}
                        className="w-40 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        <span>Run Edit</span>
                    </button>
                </div>
            </div>
        </div>
    );
};