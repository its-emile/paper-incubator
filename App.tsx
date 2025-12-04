import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { RepoModal } from './components/RepoModal';
import { PaperDisplay } from './components/PaperDisplay';
import { Spinner } from './components/Spinner';
import { usePaperState } from './hooks/usePaperState';
import { fetchRepoContents } from './services/githubService';
import { generateInitialDraft, runEditingRoundStream, runGlobalImprovementRound } from './services/openaiService';
import type { EditingOptions, Paper, Section, SectionName } from './types';
import { SECTION_ORDER } from './constants';
import { EditingModal } from './components/EditingControls';
import { SavePromptModal } from './components/SavePromptModal';

const serializePaperContent = (sections: Record<SectionName, Section>): string => {
  return SECTION_ORDER
    .map(sectionName => {
      const section = sections[sectionName];
      if (section && section.content) {
        return `## ${section.title}\n\n${section.content}`;
      }
      return `## ${section.title}\n\n(Not yet drafted)`;
    })
    .filter(Boolean)
    .join('\n\n---\n\n');
};

export default function App() {
  const { paper, setPaper, isLoading, setIsLoading, clearPaper } = usePaperState();
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [globalStatus, setGlobalStatus] = useState('Ready.');
  
  const [editingProgress, setEditingProgress] = useState<{ sectionId: SectionName; subsectionIndex: number } | null>(null);
  const [streamedContent, setStreamedContent] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const [paperHistory, setPaperHistory] = useState<Record<string, string>>({});
  const [editingModalState, setEditingModalState] = useState<{
    isOpen: boolean;
    sectionId: SectionName | null;
    subsectionIndex: number | null;
  }>({ isOpen: false, sectionId: null, subsectionIndex: null });
  const [isGlobalEditingModalOpen, setIsGlobalEditingModalOpen] = useState(false);
  const [isSavePromptModalOpen, setIsSavePromptModalOpen] = useState(false);

  const startNewPaper = useCallback(async (repoUrl: string, newApiKey: string) => {
    setIsRepoModalOpen(false);
    if (!newApiKey) {
      setGlobalStatus("Error: OpenAI API key is required.");
      return;
    }
    setApiKey(newApiKey);
    setIsLoading(true);
    setGlobalStatus('Initializing paper structure...');
    setPaperHistory({});
    
    const emptySections = SECTION_ORDER.reduce((acc, name) => {
      acc[name] = { id: name, title: name, content: '', comments: [] };
      return acc;
    }, {} as Record<SectionName, Section>);
    let currentPaperState: Paper = { repoUrl, repoContext: '', sections: emptySections };
    setPaper(currentPaperState);

    try {
      setGlobalStatus('Fetching repository contents...');
      const repoContext = await fetchRepoContents(repoUrl);
      currentPaperState.repoContext = repoContext;
      setPaper(currentPaperState);

      for (const sectionName of SECTION_ORDER) {
        setGlobalStatus(`Drafting: ${sectionName}...`);
        const fullPaperContext = serializePaperContent(currentPaperState.sections);
        const newSection = await generateInitialDraft(repoContext, newApiKey, sectionName, fullPaperContext);
        currentPaperState.sections[sectionName] = newSection;
        setPaper({ ...currentPaperState });
      }

    } catch (error) {
      console.error('Failed to start new paper:', error);
      setGlobalStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setGlobalStatus('Ready.');
    }
  }, [setPaper, setIsLoading]);

  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if(savedKey) setApiKey(savedKey);

    if (paper) {
      setGlobalStatus('Loaded from previous session.');
    }
  }, [paper]);
  
  const handleImproveRequest = (sectionId: SectionName, subsectionIndex: number) => {
    setEditingModalState({ isOpen: true, sectionId, subsectionIndex });
  };

  const handleConfirmEdit = async (options: EditingOptions) => {
    if (!editingModalState.isOpen || editingModalState.sectionId === null || editingModalState.subsectionIndex === null || !paper || !apiKey) {
        setGlobalStatus("Cannot start edit: Missing context.");
        return;
    }

    const { sectionId, subsectionIndex } = editingModalState;
    setEditingModalState({ isOpen: false, sectionId: null, subsectionIndex: null });

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
        const section = paper.sections[sectionId];
        const subsections = section.content.split('\n\n').filter(s => s.trim() !== '');
        const originalSubsection = subsections[subsectionIndex];

        if (originalSubsection === undefined) throw new Error("Subsection not found.");

        const historyKey = `${sectionId}-${subsectionIndex}`;
        setPaperHistory(prev => ({ ...prev, [historyKey]: originalSubsection }));

        setGlobalStatus(`Editing: ${sectionId} (paragraph ${subsectionIndex + 1})`);
        setEditingProgress({ sectionId, subsectionIndex });
        setStreamedContent('');

        let finalContent = '';
        await runEditingRoundStream(
            serializePaperContent(paper.sections),
            sectionId,
            originalSubsection,
            options,
            apiKey,
            (token) => {
                finalContent += token;
                setStreamedContent(prev => prev + token);
            },
            signal
        );

        const newSubsections = [...subsections];
        newSubsections[subsectionIndex] = finalContent.trim() || originalSubsection;
        const newSectionContent = newSubsections.join('\n\n');
        
        setPaper(prevPaper => {
            if (!prevPaper) return null;
            const updatedSections = {
                ...prevPaper.sections,
                [sectionId]: { ...prevPaper.sections[sectionId], content: newSectionContent }
            };
            return { ...prevPaper, sections: updatedSections };
        });

    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            setGlobalStatus('Editing cancelled.');
        } else {
            console.error('Failed to run editing round:', error);
            setGlobalStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    } finally {
        setEditingProgress(null);
        setStreamedContent('');
        if (!abortControllerRef.current?.signal.aborted) {
          setGlobalStatus('Editing complete.');
        }
    }
  };
  
  const handleRestoreSubsection = (sectionId: SectionName, subsectionIndex: number) => {
    if (!paper) return;
    const historyKey = `${sectionId}-${subsectionIndex}`;
    const previousContent = paperHistory[historyKey];

    if (previousContent) {
        const section = paper.sections[sectionId];
        const subsections = section.content.split('\n\n').filter(s => s.trim() !== '');
        setPaperHistory(prev => ({ ...prev, [historyKey]: subsections[subsectionIndex] }));
        subsections[subsectionIndex] = previousContent;
        const newSectionContent = subsections.join('\n\n');

        setPaper(prevPaper => {
            if (!prevPaper) return null;
            const updatedSections = {
                ...prevPaper.sections,
                [sectionId]: { ...prevPaper.sections[sectionId], content: newSectionContent }
            };
            return { ...prevPaper, sections: updatedSections };
        });
        setGlobalStatus(`Restored paragraph ${subsectionIndex + 1} in ${sectionId}.`);
    } else {
        setGlobalStatus('No previous version found.');
    }
  };

  const handleDeleteSubsection = (sectionId: SectionName, subsectionIndex: number) => {
    if (!paper) return;
    const section = paper.sections[sectionId];
    const subsections = section.content.split('\n\n').filter(s => s.trim() !== '');
    
    if (subsections[subsectionIndex] !== undefined) {
        subsections.splice(subsectionIndex, 1);
        const newSectionContent = subsections.join('\n\n');

        setPaper(prevPaper => {
            if (!prevPaper) return null;
            const updatedSections = {
                ...prevPaper.sections,
                [sectionId]: { ...prevPaper.sections[sectionId], content: newSectionContent }
            };
            return { ...prevPaper, sections: updatedSections };
        });
        setGlobalStatus(`Deleted paragraph ${subsectionIndex + 1} from ${sectionId}.`);
    }
  };
  
  const handleCancelEditing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleSavePaper = () => {
    if (!paper) return;

    const title = paper.sections.Title.content || 'Untitled Paper';
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${sanitizedTitle}.md`;

    let markdownContent = `# ${title}\n\n`;
    SECTION_ORDER.forEach(sectionName => {
        if (sectionName === 'Title') return;
        const section = paper.sections[sectionName];
        if (section) {
            markdownContent += `## ${section.title}\n\n`;
            markdownContent += `${section.content || '(Not yet drafted)'}\n\n`;
        }
    });

    markdownContent += `---\n\nSource Repository: ${paper.repoUrl}\n`;

    const element = document.createElement("a");
    const file = new Blob([markdownContent], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    setGlobalStatus(`Paper saved as ${filename}.`);
  };

  const handleConfirmGlobalImprovement = async (options: EditingOptions) => {
    if (!paper || !apiKey) {
      setGlobalStatus("Cannot start edit: Missing context.");
      return;
    }
    setIsGlobalEditingModalOpen(false);
    setIsLoading(true);
    setGlobalStatus('Performing global improvement review...');

    try {
      const fullPaperContext = serializePaperContent(paper.sections);
      const { sectionToUpdate, newContent } = await runGlobalImprovementRound(fullPaperContext, options, apiKey);

      setPaper(prevPaper => {
        if (!prevPaper) return null;
        const updatedSections = {
            ...prevPaper.sections,
            [sectionToUpdate]: { ...prevPaper.sections[sectionToUpdate], content: newContent }
        };
        return { ...prevPaper, sections: updatedSections };
      });
      setGlobalStatus(`Paper improved: Updated the ${sectionToUpdate} section.`);
    } catch (error) {
      console.error('Failed to run global improvement round:', error);
      setGlobalStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNewPaperRequest = () => {
    if (paper) {
      setIsSavePromptModalOpen(true);
    } else {
      setIsRepoModalOpen(true);
    }
  }

  const showInitialModal = !paper && !isLoading;

  return (
    <div className="min-h-screen bg-gray-100 font-serif text-gray-800">
      <Header 
        onNewPaper={handleNewPaperRequest} 
        onSave={handleSavePaper}
        onImprove={() => setIsGlobalEditingModalOpen(true)}
        repoUrl={paper?.repoUrl || ''} 
        isLoading={isLoading} 
        isEditing={!!editingProgress} 
        onCancelEditing={handleCancelEditing}
        isPaperLoaded={!!paper}
      />

      <main className="container mx-auto px-4 py-8">
        {isLoading && !paper?.sections.Title.content && (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
            <Spinner />
            <p className="mt-4 text-lg text-gray-600">{globalStatus}</p>
          </div>
        )}

        {paper && paper?.sections.Title.content && (
          <PaperDisplay 
            paper={paper} 
            setPaper={setPaper} 
            paperHistory={paperHistory}
            onImproveRequest={handleImproveRequest}
            onRestore={handleRestoreSubsection}
            onDelete={handleDeleteSubsection}
            onCancelEditing={handleCancelEditing}
            isEditing={!!editingProgress}
            status={globalStatus}
            editingProgress={editingProgress}
            streamedContent={streamedContent}
          />
        )}
        
      </main>

      {(isRepoModalOpen || showInitialModal) && (
        <RepoModal
          onClose={() => setIsRepoModalOpen(false)}
          onSubmit={(url, key) => {
            if(paper) clearPaper();
            localStorage.setItem('openai_api_key', key);
            startNewPaper(url, key);
          }}
          isInitialSetup={showInitialModal}
        />
      )}
      <EditingModal 
        isOpen={editingModalState.isOpen}
        onClose={() => setEditingModalState({ isOpen: false, sectionId: null, subsectionIndex: null })}
        onRunEdit={handleConfirmEdit}
        title="Improve Subsection"
      />
      <EditingModal 
        isOpen={isGlobalEditingModalOpen}
        onClose={() => setIsGlobalEditingModalOpen(false)}
        onRunEdit={handleConfirmGlobalImprovement}
        title="Improve Paper"
      />
      <SavePromptModal
        isOpen={isSavePromptModalOpen}
        onClose={() => setIsSavePromptModalOpen(false)}
        onSaveAndContinue={() => {
          handleSavePaper();
          setIsSavePromptModalOpen(false);
          setIsRepoModalOpen(true);
        }}
        onContinueWithoutSaving={() => {
          setIsSavePromptModalOpen(false);
          setIsRepoModalOpen(true);
        }}
      />
    </div>
  );
}