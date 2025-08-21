import { browser } from '$app/environment';
import { getLLMSettings, LLMClient, type LLMConfig } from '$lib/utils/llm';

export const prerender = true; // Enable prerendering with query parameters

export interface PageData {
	draftId: string | null;
	llmSettings: LLMConfig | null;
	llmClient: LLMClient | null;
	llmConfigError: string | null;
}

export async function load({ url }): Promise<PageData> {
	let llmSettings: LLMConfig | null = null;
	let llmClient: LLMClient | null = null;
	let llmConfigError: string | null = null;

	if (browser) {
		try {
			llmSettings = getLLMSettings();
			llmClient = new LLMClient(llmSettings);
		} catch (error) {
			llmConfigError = error instanceof Error ? error.message : 'Unknown error configuring LLM';
			console.warn('LLM configuration error:', error);
		}
	}

	return {
		draftId: url.searchParams.get('id'),
		llmSettings,
		llmClient,
		llmConfigError
	};
}