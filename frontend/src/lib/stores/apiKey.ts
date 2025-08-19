import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { OpenRouterClient } from '$lib/utils/openRouter.js';

export const apiKey = writable<string>('');
export const isValidApiKey = writable<boolean>(false);

// Load API key from localStorage on initialization
if (browser) {
	const savedApiKey = localStorage.getItem('openrouter-api-key');
	if (savedApiKey) {
		apiKey.set(savedApiKey);
	}
}

// Subscribe to API key changes and save to localStorage
apiKey.subscribe((key) => {
	if (browser && key) {
		localStorage.setItem('openrouter-api-key', key);
	} else if (browser && !key) {
		localStorage.removeItem('openrouter-api-key');
	}
});

export async function validateApiKey(key: string): Promise<boolean> {
	try {
		const client = new OpenRouterClient({ apiKey: key });
		const valid = await client.validateApiKey();
		isValidApiKey.set(valid);
		if (valid) {
			apiKey.set(key);
		}
		return valid;
	} catch (error) {
		isValidApiKey.set(false);
		return false;
	}
}

export function setApiKey(key: string) {
	apiKey.set(key);
}

export function clearApiKey() {
	apiKey.set('');
	isValidApiKey.set(false);
	if (browser) {
		localStorage.removeItem('openrouter-api-key');
	}
}