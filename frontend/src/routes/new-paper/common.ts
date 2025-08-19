export type WorkflowStep = 'format' | 'documents' | 'focus' | 'outline' | 'writing';

// Citation interface
export interface Citation {
    id: string;
    title: string;
    authors: string[];
    year: number;
    journal?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    doi?: string;
    url?: string;
    type: 'article' | 'book' | 'inproceedings' | 'webpage' | 'misc';
    abstract?: string;
    notes: string;
    summary?: string;
    dateAdded: string;
}