import React, { useState } from 'react';
import type { Section, SectionName } from '../types';
import { CommentThread } from './CommentThread';
import { PaperclipIcon } from './icons/PaperclipIcon';

interface SectionCardProps {
  section: Section;
  onAddComment: (text: string) => void;
  editingProgress: { sectionId: SectionName; subsectionIndex: number } | null;
  streamedContent: string;
  paperHistory: Record<string, string>;
  onImproveRequest: (sectionId: SectionName, subsectionIndex: number) => void;
  onRestore: (sectionId: SectionName, subsectionIndex: number) => void;
  onDelete: (sectionId: SectionName, subsectionIndex: number) => void;
}

const Subsection: React.FC<{ content: string, isEditing: boolean }> = ({ content, isEditing }) => {
    const blinkingCursor = isEditing ? 'after:content-["▋"] after:ml-1 after:animate-pulse' : '';

    if (content.startsWith('### ')) {
        return <h3 className="text-xl font-bold mt-4 mb-2 font-sans">{content.substring(4)}</h3>;
    }
    if (content.startsWith('## ')) {
        return <h2 className="text-2xl font-bold mt-6 mb-3 border-b border-gray-200 pb-1 font-sans">{content.substring(3)}</h2>;
    }
    if (content.startsWith('# ')) {
        return <h1 className="text-3xl font-bold mt-6 mb-3 border-b border-gray-200 pb-1 font-sans">{content.substring(2)}</h1>;
    }

    return (
        <p className={`text-justify leading-relaxed transition-colors duration-300 ${isEditing ? 'text-blue-700 bg-blue-50 rounded-md p-2' : ''} ${blinkingCursor}`}>
            {content}
        </p>
    );
};

export const SectionCard: React.FC<SectionCardProps> = ({ 
  section, 
  onAddComment, 
  editingProgress, 
  streamedContent,
  paperHistory,
  onImproveRequest,
  onRestore,
  onDelete,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  let displayContent = section.content.trim();
  if (displayContent.toLowerCase().startsWith(section.title.toLowerCase())) {
      displayContent = displayContent.substring(section.title.length).trim();
      while(displayContent.startsWith('#') || displayContent.startsWith(':')) {
        displayContent = displayContent.substring(1).trim();
      }
  }

  const subsections = displayContent ? displayContent.split('\n\n').filter(s => s.trim() !== '') : [];

  const ActionButton: React.FC<{onClick: () => void, children: React.ReactNode, disabled?: boolean, className?: string}> = 
    ({onClick, children, disabled = false, className = ''}) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
        {children}
    </button>
  );

  return (
    <div id={section.id} className="transition-all duration-300">
      <div className="pb-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2 font-sans">{section.title}</h2>
        <div className="space-y-4">
            {subsections.length > 0 ? subsections.map((subsection, index) => {
                const isEditingThis = editingProgress?.sectionId === section.id && editingProgress?.subsectionIndex === index;
                const isHovered = hoveredIndex === index;
                const historyKey = `${section.id}-${index}`;
                const isRestorable = !!paperHistory[historyKey];

                return (
                    <div 
                      key={`${section.id}-${index}`}
                      className="relative"
                      onMouseEnter={() => !editingProgress && setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {isHovered && !isEditingThis && (
                        <div className="absolute top-0 right-0 -mt-2 -mr-2 z-10 bg-white shadow-lg border rounded-lg p-1 flex gap-1 font-sans">
                          <ActionButton 
                            onClick={() => onImproveRequest(section.id, index)}
                            className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                          >
                            Improve
                          </ActionButton>
                          <ActionButton 
                            onClick={() => onRestore(section.id, index)}
                            disabled={!isRestorable}
                            className="bg-gray-100 text-gray-800 hover:bg-gray-200"
                          >
                            Restore
                          </ActionButton>
                           <ActionButton 
                            onClick={() => onDelete(section.id, index)}
                            className="bg-red-100 text-red-800 hover:bg-red-200"
                          >
                            Delete
                          </ActionButton>
                        </div>
                      )}
                      <Subsection
                          content={isEditingThis ? streamedContent : subsection}
                          isEditing={!!isEditingThis}
                      />
                    </div>
                )
            }) : <p className="text-gray-400 italic">TODO: {section.title}</p>}
        </div>
      </div>
      {section.comments.length > 0 && (
         <div className="px-1 pb-4">
             <button 
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold font-sans"
            >
                <PaperclipIcon className="w-4 h-4" />
                <span>{showComments ? 'Hide' : 'Show'} {section.comments.length} Comments</span>
            </button>
         </div>
      )}
      {showComments && (
        <div className="bg-gray-50 p-4 border-t border-gray-200 rounded-b-md font-sans">
          <CommentThread comments={section.comments} onAddComment={onAddComment} />
        </div>
      )}
    </div>
  );
};
