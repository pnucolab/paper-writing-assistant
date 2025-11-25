// Shared AI Revision and Fact Check Utilities

import { LLMClient, getLLMSettings, type WebSearchOptions } from './llm';
import { getAIReviewerPrompt, getAIRevisorPrompt, getAIFactCheckPrompt } from './promptLoader';

export interface RevisionResult {
	needsRevision: boolean;
	reason: string;
	revisedText?: string;
}

export interface FactCheckResult {
	analysis: string;
}

export interface CustomRevisionResult {
	revisedText: string;
	reviewerAssessment: string;
}

/**
 * Performs the complete AI revision workflow (reviewer -> revisor)
 */
export async function performAIRevision(
	selectedText: string,
	fullManuscript: string
): Promise<RevisionResult> {
	const settings = getLLMSettings();
	const llmClient = new LLMClient(settings);

	// Stage 1: Reviewer Agent - Assess if revision is needed
	const reviewerPrompt = await getAIReviewerPrompt(selectedText, fullManuscript);

	const reviewerResponse = await llmClient.chatCompletion('', reviewerPrompt);
	
	// Parse reviewer response
	let reviewerResult;
	try {
		reviewerResult = JSON.parse(reviewerResponse.content);
	} catch (parseError) {
		console.error('Failed to parse reviewer response:', parseError);
		// If JSON parsing fails, assume revision is needed
		reviewerResult = { needs_revision: true, reason: 'Unable to parse reviewer response, proceeding with revision' };
	}
	
	if (!reviewerResult.needs_revision) {
		// No revision needed - return original text
		return {
			needsRevision: false,
			reason: reviewerResult.reason,
			revisedText: selectedText
		};
	}

	// Stage 2: Revisor Agent - Perform the actual revision
	const revisorPrompt = await getAIRevisorPrompt(selectedText, reviewerResult.reason, fullManuscript);

	const revisorResponse = await llmClient.chatCompletion('', revisorPrompt);

	return {
		needsRevision: true,
		reason: reviewerResult.reason,
		revisedText: revisorResponse.content
	};
}

/**
 * Performs custom revision based on user instructions
 */
export async function performCustomRevision(
	textToRevise: string,
	customInstruction: string,
	fullManuscript: string
): Promise<CustomRevisionResult> {
	const settings = getLLMSettings();
	const llmClient = new LLMClient(settings);

	// Create custom revision prompt
	const customRevisorPrompt = await getAIRevisorPrompt(
		textToRevise,
		`Custom user instruction: ${customInstruction}`,
		fullManuscript
	);

	const customResponse = await llmClient.chatCompletion('', customRevisorPrompt);

	return {
		revisedText: customResponse.content,
		reviewerAssessment: `Custom revision requested: "${customInstruction}"`
	};
}

/**
 * Performs AI fact checking with web search
 */
export async function performAIFactCheck(
	selectedText: string,
	fullManuscript: string
): Promise<FactCheckResult> {
	const settings = getLLMSettings();
	const llmClient = new LLMClient(settings);

	const prompt = await getAIFactCheckPrompt(selectedText, fullManuscript);

	// Use web search for fact checking to verify claims against current information
	const webSearchOptions: WebSearchOptions = {
		enabled: true,
		maxResults: 10,
		searchPrompt: 'Use the following web search results to verify factual claims and provide evidence-based analysis. Cite sources using markdown links when referencing specific information from the search results.'
	};

	const response = await llmClient.chatCompletionWithWebSearch('', prompt, webSearchOptions);

	return {
		analysis: response.content
	};
}

/**
 * Creates word-level diff highlighting using WikEdDiff
 */
export function createWordDiff(original: string, revised: string) {
	try {
		// Create WikEdDiff instance - check if it's available globally
		const WikEdDiffConstructor = (globalThis as any).WikEdDiff;
		if (typeof WikEdDiffConstructor !== 'function') {
			console.warn('WikEdDiff not available, falling back to simple diff');
			return createSimpleDiff(original, revised);
		}
		
		const wikEdDiff = new WikEdDiffConstructor();
		
		// Perform the diff - WikEdDiff.diff() returns HTML with changes highlighted
		const diffResult = wikEdDiff.diff(original, revised);
		
		return {
			diffResult: diffResult
		};
	} catch (error) {
		console.error('WikEdDiff error:', error);
		// Fallback to simple diff if WikEdDiff fails
		return createSimpleDiff(original, revised);
	}
}

/**
 * Fallback simple diff function
 */
function createSimpleDiff(original: string, revised: string) {
	const originalWords = original.split(/(\s+)/);
	const revisedWords = revised.split(/(\s+)/);
	
	const maxLength = Math.max(originalWords.length, revisedWords.length);
	const result = [];
	
	for (let i = 0; i < maxLength; i++) {
		const origWord = originalWords[i] || '';
		const revWord = revisedWords[i] || '';
		
		if (origWord !== revWord) {
			// Show deletions with strikethrough and red background
			if (origWord && origWord.trim()) {
				result.push(`<span class="wikEdDiffDelete">${origWord}</span>`);
			}
			// Show insertions with green background
			if (revWord && revWord.trim()) {
				result.push(`<span class="wikEdDiffInsert">${revWord}</span>`);
			}
			// Handle whitespace
			if (!origWord.trim() && !revWord.trim()) {
				result.push(revWord || origWord);
			}
		} else {
			result.push(origWord);
		}
	}
	
	return {
		diffResult: result.join('')
	};
}