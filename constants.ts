
import type { SectionName } from './types';

export const INITIAL_REPO_URL = 'https://github.com/its-emile/llm-security-review-weakness';

export const SECTION_ORDER: SectionName[] = [
    'Title',
    'Abstract',
    'Introduction',
    'Related Work',
    'Methodology',
    'Results',
    'Discussion',
    'Conclusion',
    'References'
];

export const EDITING_OPTIONS_MAP: { key: keyof import('./types').EditingOptions; label: string }[] = [
    { key: 'formatting', label: 'Formatting' },
    { key: 'style', label: 'Style' },
    { key: 'depth', label: 'Depth' },
    { key: 'rigor', label: 'Rigor' },
    { key: 'hastyStatements', label: 'Unverified Statements' },
    { key: 'coherence', label: 'Coherence' },
    { key: 'redundancy', label: 'Redundancy' },
    { key: 'references', label: 'References' },
];
