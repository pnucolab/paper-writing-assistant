// Prompt metadata and versioning types

export type PromptCategory = 'file-processing' | 'focus' | 'outline' | 'writing' | 'revision';

export interface PromptMetadata {
	version: string;
	name: string;
	description: string;
	category: PromptCategory;
	usedIn: string; // Which step/page uses this prompt
}

export interface PromptTemplate {
	id: string;
	metadata: PromptMetadata;
	template: string;
	fileName: string;
}

export interface UserPromptOverride {
	promptId: string;
	customTemplate: string;
	updatedAt: string;
}

// List of all available prompts with their metadata
export const PROMPT_DEFINITIONS: Record<string, Omit<PromptTemplate, 'template'>> = {
	'focus-step': {
		id: 'focus-step',
		metadata: {
			version: 'v1.0.0',
			name: 'Research Focus Development',
			description: 'Guides researchers in developing their research focus with AI assistance',
			category: 'focus',
			usedIn: 'Focus Step - Chat Interface'
		},
		fileName: 'focus-step-v1.0.0.md'
	},
	'focus-generation': {
		id: 'focus-generation',
		metadata: {
			version: 'v1.0.0',
			name: 'Research Focus Generation from Chat',
			description: 'Generates comprehensive research focus statement from conversation history',
			category: 'focus',
			usedIn: 'Focus Step - Generate Button'
		},
		fileName: 'focus-generation-v1.0.0.md'
	},
	'title-generation': {
		id: 'title-generation',
		metadata: {
			version: 'v1.0.0',
			name: 'Title Generation',
			description: 'Generates compelling academic paper titles based on research focus',
			category: 'outline',
			usedIn: 'Outline Step - Title Generation'
		},
		fileName: 'title-generation-v1.0.0.md'
	},
	'outline-generation': {
		id: 'outline-generation',
		metadata: {
			version: 'v1.0.0',
			name: 'Outline Structure Generation',
			description: 'Creates customized paper outline structure based on research content',
			category: 'outline',
			usedIn: 'Outline Step - Structure Generation'
		},
		fileName: 'outline-generation-v1.0.0.md'
	},
	'keypoints-references-generation': {
		id: 'keypoints-references-generation',
		metadata: {
			version: 'v1.0.0',
			name: 'Key Points and References Generation',
			description: 'Generates section key points with suggested citations and figure references',
			category: 'outline',
			usedIn: 'Outline Step - Key Points Generation'
		},
		fileName: 'keypoints-references-generation-v1.0.0.md'
	},
	'figure-legends': {
		id: 'figure-legends',
		metadata: {
			version: 'v1.0.0',
			name: 'Figure Legends Generation',
			description: 'Generates comprehensive academic figure legends',
			category: 'writing',
			usedIn: 'Writing Step - Figure Legends'
		},
		fileName: 'figure-legends-v1.0.0.md'
	},
	'section-writing': {
		id: 'section-writing',
		metadata: {
			version: 'v1.0.0',
			name: 'Section Writing',
			description: 'Writes individual paper sections following academic writing standards',
			category: 'writing',
			usedIn: 'Writing Step - Section Generation'
		},
		fileName: 'section-writing-v1.0.0.md'
	},
	'ai-reviewer': {
		id: 'ai-reviewer',
		metadata: {
			version: 'v1.0.0',
			name: 'AI Reviewer (First Stage)',
			description: 'Reviews section text and determines if revision is needed',
			category: 'revision',
			usedIn: 'Editor - AI Review'
		},
		fileName: 'ai-reviewer-v1.0.0.md'
	},
	'ai-revisor': {
		id: 'ai-revisor',
		metadata: {
			version: 'v1.0.0',
			name: 'AI Revisor (Second Stage)',
			description: 'Revises section text based on reviewer feedback',
			category: 'revision',
			usedIn: 'Editor - AI Revision'
		},
		fileName: 'ai-revisor-v1.0.0.md'
	},
	'ai-fact-check': {
		id: 'ai-fact-check',
		metadata: {
			version: 'v1.0.0',
			name: 'AI Fact Checker',
			description: 'Analyzes text for factual accuracy and consistency',
			category: 'revision',
			usedIn: 'Editor - Fact Check'
		},
		fileName: 'ai-fact-check-v1.0.0.md'
	},
	'revision-chatbot': {
		id: 'revision-chatbot',
		metadata: {
			version: 'v1.0.0',
			name: 'Revision Chatbot Assistant',
			description: 'AI assistant for paper revision questions and suggestions',
			category: 'revision',
			usedIn: 'Revisions Page - Chat'
		},
		fileName: 'revision-chatbot-v1.0.0.md'
	},
	'file-summary': {
		id: 'file-summary',
		metadata: {
			version: 'v1.0.0',
			name: 'File Summary',
			description: 'Summarizes uploaded files (documents, code, data) for research purposes',
			category: 'file-processing',
			usedIn: 'Documents Step - File Upload'
		},
		fileName: 'file-summary-v1.0.0.md'
	},
	'image-summary': {
		id: 'image-summary',
		metadata: {
			version: 'v1.0.0',
			name: 'Image Summary',
			description: 'Summarizes and analyzes uploaded images for research',
			category: 'file-processing',
			usedIn: 'Documents Step - Image Upload'
		},
		fileName: 'image-summary-v1.0.0.md'
	}
};
