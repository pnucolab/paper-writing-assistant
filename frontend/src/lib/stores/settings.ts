import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { ModelInfo } from '$lib/utils/openRouter.js';

// Model selection
export const selectedModel = writable<ModelInfo | null>(null);

// Model parameters
export const modelParameters = writable({
	temperature: 0.7,
	maxTokens: 2048,
	topP: 1.0,
	frequencyPenalty: 0.0,
	presencePenalty: 0.0
});

// Citation settings
export const citationSettings = writable({
	citationStyle: 'apa',
	autoCitation: true,
	bibliographyFormat: 'alphabetical',
	includeDOI: true,
	includeURLs: false,
	exportFormat: 'bibtex'
});

// Load settings from localStorage
if (browser) {
	// Load selected model
	const savedModel = localStorage.getItem('selected-model');
	if (savedModel) {
		try {
			selectedModel.set(JSON.parse(savedModel));
		} catch (e) {
			console.error('Failed to parse saved model:', e);
		}
	}

	// Load model parameters
	const savedParams = localStorage.getItem('model-parameters');
	if (savedParams) {
		try {
			const params = JSON.parse(savedParams);
			modelParameters.set({
				temperature: params.temperature ?? 0.7,
				maxTokens: params.maxTokens ?? 2048,
				topP: params.topP ?? 1.0,
				frequencyPenalty: params.frequencyPenalty ?? 0.0,
				presencePenalty: params.presencePenalty ?? 0.0
			});
		} catch (e) {
			console.error('Failed to parse saved parameters:', e);
		}
	}

	// Load citation settings
	const savedCitations = localStorage.getItem('citation-settings');
	if (savedCitations) {
		try {
			const settings = JSON.parse(savedCitations);
			citationSettings.set({
				citationStyle: settings.citationStyle ?? 'apa',
				autoCitation: settings.autoCitation ?? true,
				bibliographyFormat: settings.bibliographyFormat ?? 'alphabetical',
				includeDOI: settings.includeDOI ?? true,
				includeURLs: settings.includeURLs ?? false,
				exportFormat: settings.exportFormat ?? 'bibtex'
			});
		} catch (e) {
			console.error('Failed to parse saved citation settings:', e);
		}
	}
}

// Save changes to localStorage
selectedModel.subscribe((model) => {
	if (browser && model) {
		localStorage.setItem('selected-model', JSON.stringify(model));
	}
});

modelParameters.subscribe((params) => {
	if (browser) {
		localStorage.setItem('model-parameters', JSON.stringify(params));
	}
});

citationSettings.subscribe((settings) => {
	if (browser) {
		localStorage.setItem('citation-settings', JSON.stringify(settings));
	}
});

// Reset functions
export function resetParametersToDefaults() {
	modelParameters.set({
		temperature: 0.7,
		maxTokens: 2048,
		topP: 1.0,
		frequencyPenalty: 0.0,
		presencePenalty: 0.0
	});
}

export function resetCitationToDefaults() {
	citationSettings.set({
		citationStyle: 'apa',
		autoCitation: true,
		bibliographyFormat: 'alphabetical',
		includeDOI: true,
		includeURLs: false,
		exportFormat: 'bibtex'
	});
}

export function resetAllSettings() {
	if (browser) {
		localStorage.removeItem('selected-model');
		localStorage.removeItem('model-parameters');
		localStorage.removeItem('citation-settings');
		
		selectedModel.set(null);
		resetParametersToDefaults();
		resetCitationToDefaults();
	}
}