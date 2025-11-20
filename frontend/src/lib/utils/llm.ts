import OpenAI from 'openai';

// Model info interface
export interface ModelInfo {
	id: string;
	name: string;
	context_length?: number;
	pricing?: {
		prompt: string;
		completion: string;
	};
}

// LLM Configuration interface
export interface LLMConfig {
	provider: 'openrouter' | 'custom';
	apiKey: string;
	modelName: string;
	baseURL: string;
	temperature: number;
	maxTokens: number;
}

// LLM Client class for managing OpenAI-compatible clients
export class LLMClient {
	private client: OpenAI;
	private config: LLMConfig;

	constructor(config: LLMConfig) {
		this.config = config;
		this.client = new OpenAI({
			apiKey: config.apiKey,
			baseURL: config.baseURL,
			dangerouslyAllowBrowser: true,
			//defaultHeaders: config.provider === 'openrouter' ? {
			//	'HTTP-Referer': window.location.origin,
			//	'X-Title': 'Paper Writer Assistant'
			//} : {}
		});
	}

	// Getter for config
	getConfig(): LLMConfig {
		return this.config;
	}

	// Simple chat completion
	async chatCompletion(systemPrompt: string, userPrompt: string, options?: any): Promise<{ content: string }> {
		const response = await this.client.chat.completions.create({
			model: this.config.modelName,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			],
			temperature: options?.temperature ?? this.config.temperature,
			max_tokens: options?.maxTokens ?? this.config.maxTokens,
			...options
		});

		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error('No content received from LLM response');
		}
		
		return {
			content: content
		};
	}

	// Streaming chat completion
	async chatCompletionStream(
		systemPrompt: string, 
		userPrompt: string, 
		onChunk: (chunk: string) => void,
		options?: any
	): Promise<string> {
		const stream = await this.client.chat.completions.create({
			model: this.config.modelName,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			],
			temperature: options?.temperature ?? this.config.temperature,
			max_tokens: options?.maxTokens ?? this.config.maxTokens,
			stream: true,
			...options
		}) as unknown as AsyncIterable<any>;

		let fullContent = '';
		for await (const chunk of stream) {
			const content = chunk.choices[0]?.delta?.content;
			if (content) {
				fullContent += content;
				onChunk(content);
			}
		}
		
		if (!fullContent) {
			throw new Error('No content received from LLM streaming response');
		}

		return fullContent;
	}

	// Vision-enabled chat completion for image analysis
	async visionCompletion(prompt: string, imageBase64: string, options?: any): Promise<{ content: string }> {
		const response = await this.client.chat.completions.create({
			model: this.config.modelName,
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'text',
							text: prompt
						},
						{
							type: 'image_url',
							image_url: {
								url: imageBase64
							}
						}
					]
				}
			],
			temperature: options?.temperature ?? this.config.temperature,
			max_tokens: options?.maxTokens ?? this.config.maxTokens,
			...options
		});

		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error('No content received from vision model response');
		}

		return {
			content: content
		};
	}

	// File-enabled chat completion for document analysis
	async fileCompletion(prompt: string, fileDataUri: string, filename: string, options?: any): Promise<{ content: string }> {
		const response = await this.client.chat.completions.create({
			model: this.config.modelName,
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'text',
							text: prompt
						},
						{
							type: 'file' as any,
							file: {
								filename: filename,
								file_data: fileDataUri
							}
						}
					] as any
				}
			],
			temperature: options?.temperature ?? this.config.temperature,
			max_tokens: options?.maxTokens ?? this.config.maxTokens,
			...options
		});

		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error('No content received from file model response');
		}

		return {
			content: content
		};
	}

	// JSON parsing wrapper around chatCompletion
	async chatCompletionJSON<T = any>(systemPrompt: string, userPrompt: string, options?: any): Promise<T> {
		const result = await this.chatCompletion(systemPrompt, userPrompt, options);
		let content = result.content.trim();

		// Remove markdown JSON formatting
		if (content.startsWith('```json')) {
			content = content.slice(7).trim();
		} else if (content.startsWith('```')) {
			content = content.slice(3).trim();
		}
		if (content.endsWith('```')) {
			content = content.slice(0, -3).trim();
		}

		// Clean up whitespace and newlines
		content = content.replace(/^\s+|\s+$/g, '').replace(/^\n+|\n+$/g, '');

		try {
			return JSON.parse(content) as T;
		} catch (error) {
			throw new Error(`Failed to parse JSON response: ${error}. Raw content: ${content}`);
		}
	}
}

// Utility function to load LLM settings from unified localStorage
export function getLLMSettings(): LLMConfig {
	try {
		// Get unified settings
		const savedSettings = localStorage.getItem('paperwriter-settings');
		if (!savedSettings) {
			throw new Error('Settings not configured. Please go to Settings and configure your LLM provider.');
		}
		
		let settings: any;
		try {
			settings = JSON.parse(savedSettings);
		} catch (error) {
			throw new Error('Invalid settings configuration. Please reconfigure in Settings.');
		}
		
		const providerType = settings.providerType || 'openrouter';
		const modelParams = {
			temperature: settings.parameters?.temperature ?? 0.7,
			maxTokens: settings.parameters?.maxTokens ?? 8192
		};
		
		// Validate parameters
		if (typeof modelParams.temperature !== 'number' || typeof modelParams.maxTokens !== 'number') {
			throw new Error('Invalid model parameters. Temperature and max tokens must be numbers.');
		}
		
		if (providerType === 'openrouter') {
			const openRouterKey = settings.openrouter?.apiKey;
			const selectedModel = settings.openrouter?.selectedModel;
			
			// Throw error if required settings are missing
			if (!openRouterKey) {
				throw new Error('OpenRouter API key not configured. Please go to Settings and add your OpenRouter API key.');
			}
			
			if (!selectedModel?.id) {
				throw new Error('No model selected. Please go to Settings and select an OpenRouter model.');
			}
			
			return {
				provider: 'openrouter',
				apiKey: openRouterKey,
				modelName: selectedModel.id,
				baseURL: 'https://openrouter.ai/api/v1',
				temperature: modelParams.temperature,
				maxTokens: modelParams.maxTokens
			};
			
		} else if (providerType === 'custom') {
			const customSettings = settings.custom;
			
			if (!customSettings?.endpoint) {
				throw new Error('Custom LLM endpoint not configured. Please go to Settings and add your API endpoint.');
			}
			
			if (!customSettings?.modelName) {
				throw new Error('Custom model name not configured. Please go to Settings and add your model name.');
			}
			
			return {
				provider: 'custom',
				apiKey: customSettings.apiKey || '',
				modelName: customSettings.modelName,
				baseURL: customSettings.endpoint,
				temperature: modelParams.temperature,
				maxTokens: modelParams.maxTokens
			};
			
		} else {
			throw new Error('Invalid provider type. Please reconfigure in Settings.');
		}
		
	} catch (error) {
		throw error; // Re-throw to maintain error context
	}
}