import React from 'react';
import type { Paper, EditingOptions, SectionName } from '../types';
import { SectionCard } from './SectionCard';
import { Spinner } from './Spinner';
import { SECTION_ORDER } from '../constants';

interface PaperDisplayProps {
  paper: Paper;
  setPaper: (paper: Paper) => void;
  paperHistory: Record<string, string>;
  onImproveRequest: (sectionId: SectionName, subsectionIndex: number) => void;
  onRestore: (sectionId: SectionName, subsectionIndex: number) => void;
  onDelete: (sectionId: SectionName, subsectionIndex: number) => void;
  onCancelEditing: () => void;
  isEditing: boolean;
  status: string;
  editingProgress: { sectionId: SectionName; subsectionIndex: number } | null;
  streamedContent: string;
}

export const PaperDisplay: React.FC<PaperDisplayProps> = ({
  paper,
  setPaper,
  paperHistory,
  onImproveRequest,
  onRestore,
  onDelete,
  editingProgress,
  streamedContent,
}) => {
  
  const handleAddComment = (sectionId: string, text: string) => {
      const newComment = {
          id: `researcher-${Date.now()}`,
          author: 'Researcher' as const,
          text,
          timestamp: new Date().toISOString()
      };
      
      const updatedPaper = { ...paper };
      const section = updatedPaper.sections[sectionId as keyof typeof paper.sections];
      if (section) {
          section.comments = [...section.comments, newComment];
          setPaper(updatedPaper);
      }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2 bg-white p-8 md:p-16 shadow-lg rounded-sm">
        <div className="space-y-8">
          {SECTION_ORDER.map((sectionName) => {
            const section = paper.sections[sectionName];
            return (
              <SectionCard
                key={section.id}
                section={section}
                onAddComment={(text) => handleAddComment(section.id, text)}
                editingProgress={editingProgress}
                streamedContent={streamedContent}
                paperHistory={paperHistory}
                onImproveRequest={onImproveRequest}
                onRestore={onRestore}
                onDelete={onDelete}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
