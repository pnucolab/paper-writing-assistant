import OpenAI from 'openai';

export interface OpenRouterConfig {
	apiKey: string;
	siteUrl?: string;
	siteName?: string;
}

export interface ModelInfo {
	id: string;
	name: string;
	description?: string;
	context_length?: number;
	pricing?: {
		prompt: string;
		completion: string;
	};
}

export interface OpenRouterSettings {
	apiKey: string;
	model: string;
	maxTokens: number;
	temperature?: number;
}

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface ChatCompletionOptions {
	temperature?: number;
	max_tokens?: number;
	stream?: boolean;
	[key: string]: any;
}

export interface RetryOptions {
	maxRetries?: number;
	retryDelay?: number;
}

// Utility function to load OpenRouter settings from localStorage
export function getOpenRouterSettings(): OpenRouterSettings | null {
	try {
		const saved = localStorage.getItem('paperwriter-settings');
		if (saved) {
			const settings = JSON.parse(saved);
			return {
				apiKey: settings.openRouterApiKey,
				model: settings.selectedModel || 'openai/gpt-4o',
				maxTokens: settings.maxTokens || 2000,
				temperature: settings.temperature || 0.7
			};
		}
	} catch (error) {
		console.error('Failed to load OpenRouter settings:', error);
	}
	return null;
}

export class OpenRouterClient {
	private client: OpenAI;

	constructor(config: OpenRouterConfig) {
		if (!config.apiKey) {
			throw new Error('OpenRouter API key is required');
		}

		this.client = new OpenAI({
			baseURL: 'https://openrouter.ai/api/v1',
			apiKey: config.apiKey,
			defaultHeaders: {
				'HTTP-Referer': config.siteUrl || '',
				'X-Title': config.siteName || 'Paper Writer'
			},
			dangerouslyAllowBrowser: true
		});
	}

	async getAvailableModels(category = 'academia'): Promise<{ data: ModelInfo[] }> {
		try {
			const url = `https://openrouter.ai/api/v1/models?category=${category}`;
			const response = await fetch(url, { method: 'GET' });
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Error fetching models:', error);
			throw error;
		}
	}

	async getAllModels(): Promise<{ data: ModelInfo[] }> {
		try {
			const url = 'https://openrouter.ai/api/v1/models';
			const response = await fetch(url, { method: 'GET' });
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Error fetching all models:', error);
			throw error;
		}
	}

	async sendMessage(
		model: string,
		messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
		options: Record<string, any> = {}
	) {
		try {
			const completion = await this.client.chat.completions.create({
				model: model,
				messages: messages as any,
				...options
			});
			return completion;
		} catch (error) {
			console.error('Error sending message:', error);
			throw error;
		}
	}

	async validateApiKey(): Promise<boolean> {
		try {
			await this.getAllModels();
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Send a chat completion request with automatic retry logic and JSON parsing
	 */
	async chatCompletion(
		systemPrompt: string,
		userPrompt: string,
		options: ChatCompletionOptions = {},
		retryOptions: RetryOptions = {}
	): Promise<any> {
		const { maxRetries = 3, retryDelay = 1000 } = retryOptions;
		const messages: ChatMessage[] = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt }
		];

		let retryCount = 0;
		
		while (retryCount < maxRetries) {
			try {
				const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${this.client.apiKey}`,
						'Content-Type': 'application/json',
						'HTTP-Referer': window.location.origin,
						'X-Title': 'Paper Writer Assistant'
					},
					body: JSON.stringify({
						model: options.model || 'openai/gpt-4o',
						messages,
						temperature: options.temperature || 0.7,
						max_tokens: options.max_tokens || 2000,
						stream: options.stream || false,
						...options
					})
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
				}

				const data = await response.json();
				const generatedText = data.choices?.[0]?.message?.content || '';
				
				return {
					content: generatedText,
					usage: data.usage,
					model: data.model
				};

			} catch (error) {
				retryCount++;
				console.error(`Chat completion attempt ${retryCount} failed:`, error);
				
				if (retryCount >= maxRetries) {
					throw error;
				} else {
					// Wait before retry
					await new Promise(resolve => setTimeout(resolve, retryDelay));
				}
			}
		}
	}

	/**
	 * Send a chat completion request with automatic JSON parsing and validation
	 */
	async chatCompletionWithJSON<T = any>(
		systemPrompt: string,
		userPrompt: string,
		options: ChatCompletionOptions = {},
		retryOptions: RetryOptions = {}
	): Promise<T> {
		const { maxRetries = 3, retryDelay = 1000 } = retryOptions;
		let retryCount = 0;
		
		while (retryCount < maxRetries) {
			try {
				const result = await this.chatCompletion(systemPrompt, userPrompt, options, { maxRetries: 1 });
				
				// Try to parse JSON response
				let parsedResponse: T;
				try {
					parsedResponse = JSON.parse(result.content.trim());
				} catch (parseError) {
					throw new Error('Invalid JSON response from AI');
				}

				return parsedResponse;

			} catch (error) {
				retryCount++;
				console.error(`JSON chat completion attempt ${retryCount} failed:`, error);
				
				if (retryCount >= maxRetries) {
					throw error;
				} else {
					// Wait before retry
					await new Promise(resolve => setTimeout(resolve, retryDelay));
				}
			}
		}

		throw new Error(`Failed to get valid JSON response after ${maxRetries} attempts`);
	}

	/**
	 * Send a streaming chat completion request
	 */
	async chatCompletionStream(
		systemPrompt: string,
		userPrompt: string,
		onChunk: (chunk: string) => void,
		options: ChatCompletionOptions = {}
	): Promise<string> {
		const messages: ChatMessage[] = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt }
		];

		const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.client.apiKey}`,
				'Content-Type': 'application/json',
				'HTTP-Referer': window.location.origin,
				'X-Title': 'Paper Writer Assistant'
			},
			body: JSON.stringify({
				model: options.model || 'openai/gpt-4o',
				messages,
				temperature: options.temperature || 0.7,
				max_tokens: options.max_tokens || 2000,
				stream: true,
				...options
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
		}

		// Handle streaming response
		const reader = response.body?.getReader();
		const decoder = new TextDecoder();
		let fullContent = '';

		if (reader) {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split('\n');

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6);
						if (data === '[DONE]') break;

						try {
							const parsed = JSON.parse(data);
							const content = parsed.choices?.[0]?.delta?.content;
							
							if (content) {
								fullContent += content;
								onChunk(content);
							}
						} catch (e) {
							// Ignore parsing errors for incomplete chunks
						}
					}
				}
			}
		}

		return fullContent;
	}
}