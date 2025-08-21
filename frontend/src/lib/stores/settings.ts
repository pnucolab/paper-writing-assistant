import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { ModelInfo } from '$lib/utils/llm';

// Provider type
export type ProviderType = 'openrouter' | 'custom';
export const providerType = writable<ProviderType>('openrouter');

// OpenRouter settings
export const selectedModel = writable<ModelInfo | null>(null);
export const openRouterApiKey = writable<string>('');

// Custom LLM settings  
export const customEndpoint = writable<string>('');
export const customApiKey = writable<string>('');
export const customModelName = writable<string>('');

// Model parameters
export const modelParameters = writable({
	temperature: 0.7,
	maxTokens: 8192,
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

// Define unified settings interface
interface UnifiedSettings {
	providerType: ProviderType;
	openrouter: {
		apiKey: string;
		selectedModel: ModelInfo | null;
	};
	custom: {
		endpoint: string;
		apiKey: string;
		modelName: string;
	};
	parameters: {
		temperature: number;
		maxTokens: number;
		topP: number;
		frequencyPenalty: number;
		presencePenalty: number;
	};
	citations: {
		citationStyle: string;
		autoCitation: boolean;
		bibliographyFormat: string;
		includeDOI: boolean;
		includeURLs: boolean;
		exportFormat: string;
	};
}

// Load settings from unified localStorage
if (browser) {
	const savedSettings = localStorage.getItem('paperwriter-settings');
	if (savedSettings) {
		try {
			const settings: UnifiedSettings = JSON.parse(savedSettings);
			
			// Load all settings
			providerType.set(settings.providerType || 'openrouter');
			selectedModel.set(settings.openrouter?.selectedModel || null);
			openRouterApiKey.set(settings.openrouter?.apiKey || '');
			customEndpoint.set(settings.custom?.endpoint || '');
			customApiKey.set(settings.custom?.apiKey || '');
			customModelName.set(settings.custom?.modelName || '');
			modelParameters.set({
				temperature: settings.parameters?.temperature ?? 0.7,
				maxTokens: settings.parameters?.maxTokens ?? 8192,
				topP: settings.parameters?.topP ?? 1.0,
				frequencyPenalty: settings.parameters?.frequencyPenalty ?? 0.0,
				presencePenalty: settings.parameters?.presencePenalty ?? 0.0
			});
			citationSettings.set({
				citationStyle: settings.citations?.citationStyle ?? 'apa',
				autoCitation: settings.citations?.autoCitation ?? true,
				bibliographyFormat: settings.citations?.bibliographyFormat ?? 'alphabetical',
				includeDOI: settings.citations?.includeDOI ?? true,
				includeURLs: settings.citations?.includeURLs ?? false,
				exportFormat: settings.citations?.exportFormat ?? 'bibtex'
			});
		} catch (e) {
			console.error('Failed to parse saved settings:', e);
		}
	} else {
		// Migrate from old localStorage keys if they exist
		migrateOldSettings();
	}
}

// Migration function for old localStorage keys
function migrateOldSettings() {
	if (!browser) return;
	
	const oldProviderType = localStorage.getItem('provider-type');
	const oldModel = localStorage.getItem('selected-model');
	const oldOpenRouterKey = localStorage.getItem('openrouter-api-key');
	const oldCustomSettings = localStorage.getItem('custom-llm-settings');
	const oldParams = localStorage.getItem('model-parameters');
	const oldCitations = localStorage.getItem('citation-settings');
	
	if (oldProviderType || oldModel || oldOpenRouterKey || oldCustomSettings || oldParams || oldCitations) {
		console.log('Migrating old settings to unified storage...');
		
		// Save current settings to trigger unified save
		saveUnifiedSettings();
		
		// Clean up old keys
		localStorage.removeItem('provider-type');
		localStorage.removeItem('selected-model');
		localStorage.removeItem('openrouter-api-key');
		localStorage.removeItem('custom-llm-settings');
		localStorage.removeItem('model-parameters');
		localStorage.removeItem('citation-settings');
	}
}

// Function to save unified settings
function saveUnifiedSettings() {
	if (!browser) return;
	
	// Get current values from all stores
	let currentProviderType: ProviderType;
	let currentSelectedModel: ModelInfo | null;
	let currentOpenRouterApiKey: string;
	let currentCustomEndpoint: string;
	let currentCustomApiKey: string;
	let currentCustomModelName: string;
	let currentModelParameters: any;
	let currentCitationSettings: any;
	
	const unsubscribes = [
		providerType.subscribe(v => currentProviderType = v),
		selectedModel.subscribe(v => currentSelectedModel = v),
		openRouterApiKey.subscribe(v => currentOpenRouterApiKey = v),
		customEndpoint.subscribe(v => currentCustomEndpoint = v),
		customApiKey.subscribe(v => currentCustomApiKey = v),
		customModelName.subscribe(v => currentCustomModelName = v),
		modelParameters.subscribe(v => currentModelParameters = v),
		citationSettings.subscribe(v => currentCitationSettings = v)
	];
	
	const unifiedSettings: UnifiedSettings = {
		providerType: currentProviderType!,
		openrouter: {
			apiKey: currentOpenRouterApiKey!,
			selectedModel: currentSelectedModel!
		},
		custom: {
			endpoint: currentCustomEndpoint!,
			apiKey: currentCustomApiKey!,
			modelName: currentCustomModelName!
		},
		parameters: currentModelParameters!,
		citations: currentCitationSettings!
	};
	
	localStorage.setItem('paperwriter-settings', JSON.stringify(unifiedSettings));
	
	// Clean up subscriptions
	unsubscribes.forEach(unsub => unsub());
}

// Save changes to unified localStorage
providerType.subscribe(() => saveUnifiedSettings());
selectedModel.subscribe(() => saveUnifiedSettings());
openRouterApiKey.subscribe(() => saveUnifiedSettings());
customEndpoint.subscribe(() => saveUnifiedSettings());
customApiKey.subscribe(() => saveUnifiedSettings());
customModelName.subscribe(() => saveUnifiedSettings());
modelParameters.subscribe(() => saveUnifiedSettings());
citationSettings.subscribe(() => saveUnifiedSettings());

// Reset functions
export function resetParametersToDefaults() {
	modelParameters.set({
		temperature: 0.7,
		maxTokens: 8192,
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
		localStorage.removeItem('paperwriter-settings');
		
		providerType.set('openrouter');
		selectedModel.set(null);
		openRouterApiKey.set('');
		customEndpoint.set('');
		customApiKey.set('');
		customModelName.set('');
		resetParametersToDefaults();
		resetCitationToDefaults();
	}
}

// Export unified settings getter for other modules
export function getUnifiedSettings(): UnifiedSettings | null {
	if (!browser) return null;
	
	const saved = localStorage.getItem('paperwriter-settings');
	if (!saved) return null;
	
	try {
		return JSON.parse(saved);
	} catch (e) {
		console.error('Failed to parse unified settings:', e);
		return null;
	}
}