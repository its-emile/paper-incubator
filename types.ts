
export type SectionName = 'Title' | 'Abstract' | 'Introduction' | 'Related Work' | 'Methodology' | 'Results' | 'Discussion' | 'Conclusion' | 'References';

export interface Comment {
  id: string;
  author: 'AI Agent' | 'Researcher';
  text: string;
  timestamp: string;
}

export interface Section {
  id: SectionName;
  title: SectionName;
  content: string;
  comments: Comment[];
}

export interface Paper {
  repoUrl: string;
  repoContext: string;
  sections: Record<SectionName, Section>;
}

export interface EditingOptions {
  formatting?: boolean;
  style?: boolean;
  depth?: boolean;
  rigor?: boolean;
  hastyStatements?: boolean;
  coherence?: boolean;
  redundancy?: boolean;
  references?: boolean;
  all?: boolean;
  customInstruction?: string;
}