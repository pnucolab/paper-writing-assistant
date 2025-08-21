import { writable } from 'svelte/store';
import { browser } from '$app/environment';

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

// Draft-related interfaces
export interface PaperFormat {
	paperType: string;
	targetLength: number;
	language: string;
	citationStyle: string;
	inlineCitationStyle: string;
	includeURLs: boolean;
	includeDOI: boolean;
}

export interface ResearchFocus {
	content: string;
	chatHistory: Array<{
		role: 'user' | 'assistant';
		content: string;
		timestamp: number;
	}>;
}

export interface OutlineSection {
	id: string;
	title: string;
	keyPoints: string[];
	associatedReferences: string[];
	wordCount: number;
	order: number;
}

export interface PaperOutline {
	title: string;
	sections: OutlineSection[];
	totalWordCount: number;
	generatedWithAI: boolean;
}

export interface WritingProgress {
	sections: Record<string, {
		content: string;
		wordCount: number;
		completed: boolean;
		lastModified: number;
	}>;
	overallProgress: number;
}

export interface PaperDraft {
	id: string;
	title: string;
	currentStep: WorkflowStep;
	createdAt: number;
	modifiedAt: number;
	format?: PaperFormat;
	citations: Citation[];
	researchFocus?: ResearchFocus;
	outline?: PaperOutline;
	writing?: WritingProgress;
	finishedDrafting: boolean;
	metadata: {
		totalCitations: number;
		estimatedReadingTime: number;
		wordCount: number;
		status: 'draft' | 'completed' | 'archived';
	};
}

// Prompt-related interfaces
export interface CitationContext {
	title: string;
	authors: string;
	year: number;
	abstract: string;
}

export interface SectionContext {
	title: string;
	keyPoints: string[];
	citations: CitationContext[];
	previousContent?: string;
}

// Chat message interface
export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
	timestamp: number | string;
}

// Create stores
export const drafts = writable<PaperDraft[]>([]);
export const currentDraftId = writable<string | null>(null);

// Load drafts from localStorage
if (browser) {
	loadDrafts();
}

function loadDrafts() {
	try {
		const saved = localStorage.getItem('paperwriter-drafts');
		if (saved) {
			const draftList = JSON.parse(saved);
			drafts.set(draftList);
		}
	} catch (error) {
		console.error('Failed to load drafts:', error);
		drafts.set([]);
	}
}

function saveDrafts(draftList: PaperDraft[]) {
	if (browser) {
		try {
			localStorage.setItem('paperwriter-drafts', JSON.stringify(draftList));
		} catch (error) {
			console.error('Failed to save drafts:', error);
		}
	}
}

// Draft management functions
export function createNewDraft(title: string = 'Untitled Paper'): string {
	const draftId = generateDraftId();
	const newDraft: PaperDraft = {
		id: draftId,
		title,
		currentStep: 'format',
		createdAt: Date.now(),
		modifiedAt: Date.now(),
		citations: [],
		finishedDrafting: false,
		metadata: {
			totalCitations: 0,
			estimatedReadingTime: 0,
			wordCount: 0,
			status: 'draft'
		}
	};

	drafts.update(draftList => {
		const updated = [newDraft, ...draftList];
		saveDrafts(updated);
		return updated;
	});

	currentDraftId.set(draftId);
	return draftId;
}

export function updateDraft(draftId: string, updates: Partial<PaperDraft>) {
	drafts.update(draftList => {
		const index = draftList.findIndex(d => d.id === draftId);
		if (index !== -1) {
			const updatedDraft = {
				...draftList[index],
				...updates,
				modifiedAt: Date.now()
			};
			
			// Update metadata
			updatedDraft.metadata = {
				...updatedDraft.metadata,
				totalCitations: updatedDraft.citations.length,
				wordCount: calculateWordCount(updatedDraft),
				estimatedReadingTime: Math.ceil(calculateWordCount(updatedDraft) / 200) // 200 words per minute
			};

			draftList[index] = updatedDraft;
			saveDrafts(draftList);
		}
		return draftList;
	});
}

export function deleteDraft(draftId: string) {
	drafts.update(draftList => {
		const updated = draftList.filter(d => d.id !== draftId);
		saveDrafts(updated);
		return updated;
	});

	// Clear current draft if it was deleted
	currentDraftId.update(current => current === draftId ? null : current);
}

export function duplicateDraft(draftId: string): string {
	const newDraftId = generateDraftId();
	
	drafts.update(draftList => {
		const originalDraft = draftList.find(d => d.id === draftId);
		if (originalDraft) {
			const duplicatedDraft: PaperDraft = {
				...JSON.parse(JSON.stringify(originalDraft)), // Deep clone
				id: newDraftId,
				title: `${originalDraft.title} (Copy)`,
				createdAt: Date.now(),
				modifiedAt: Date.now()
			};
			
			const updated = [duplicatedDraft, ...draftList];
			saveDrafts(updated);
			return updated;
		}
		return draftList;
	});

	return newDraftId;
}

export function getDraftById(draftId: string): PaperDraft | null {
	let foundDraft: PaperDraft | null = null;
	drafts.subscribe(draftList => {
		foundDraft = draftList.find(d => d.id === draftId) || null;
	})();
	return foundDraft;
}

export function loadDraftById(draftId: string): PaperDraft | null {
	const draft = getDraftById(draftId);
	if (draft) {
		currentDraftId.set(draftId);
		// Load detailed draft data if needed
		loadDraftDetails(draftId);
	}
	return draft;
}

function loadDraftDetails(draftId: string) {
	// All details are now stored in the main drafts array
	// No need for separate storage
}

function saveDraftDetails(draftId: string, details: any) {
	// All details are now stored in the main drafts array
	// No need for separate storage
}

function generateDraftId(): string {
	return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function calculateWordCount(draft: PaperDraft): number {
	let wordCount = 0;
	
	// Count words in research focus
	if (draft.researchFocus?.content) {
		wordCount += draft.researchFocus.content.split(/\s+/).length;
	}
	
	// Count words in outline
	if (draft.outline?.sections) {
		draft.outline.sections.forEach(section => {
			section.keyPoints.forEach(point => {
				wordCount += point.split(/\s+/).length;
			});
		});
	}
	
	// Count words in writing content
	if (draft.writing?.sections) {
		Object.values(draft.writing.sections).forEach(section => {
			wordCount += section.wordCount || 0;
		});
	}
	
	return wordCount;
}

// Helper functions for workflow step names
export function getStepDisplayName(step: WorkflowStep): string {
	const stepNames: Record<WorkflowStep, string> = {
		'format': 'Paper Format',
		'documents': 'Citations',
		'focus': 'Research Focus',
		'outline': 'Paper Outline',
		'writing': 'Writing'
	};
	return stepNames[step] || step;
}

export function getStepNumber(step: WorkflowStep): number {
	const stepOrder: Record<WorkflowStep, number> = {
		'format': 1,
		'documents': 2,
		'focus': 3,
		'outline': 4,
		'writing': 5
	};
	return stepOrder[step] || 0;
}

// Auto-save current draft changes
export function saveCurrentDraftData(step: WorkflowStep, data: any) {
	currentDraftId.subscribe(draftId => {
		if (draftId) {
			const updates: Partial<PaperDraft> = {
				currentStep: step
			};

			switch (step) {
				case 'format':
					updates.format = data;
					break;
				case 'documents':
					updates.citations = data;
					break;
				case 'focus':
					updates.researchFocus = data;
					break;
				case 'outline':
					updates.outline = data;
					break;
				case 'writing':
					updates.writing = data;
					updates.finishedDrafting = true;
					break;
			}

			updateDraft(draftId, updates);
		}
	})();
}

// Clear all drafts (for testing or reset)
export function clearAllDrafts() {
	if (browser) {
		localStorage.removeItem('paperwriter-drafts');
		// Clear old workflow step keys
		const keysToRemove = [
			'paperwriter-paper-format',
			'paperwriter-documents',
			'paperwriter-focus',
			'paperwriter-outline-paper'
		];
		keysToRemove.forEach(key => localStorage.removeItem(key));
		
		// Clear draft history keys
		Object.keys(localStorage).forEach(key => {
			if (key.startsWith('paperwriter-history-') || key.startsWith('paperwriter-chat-')) {
				localStorage.removeItem(key);
			}
		});
	}
	drafts.set([]);
	currentDraftId.set(null);
}