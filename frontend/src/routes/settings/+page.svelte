<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Label from '$lib/components/Label.svelte';
	import Select from '$lib/components/Select.svelte';
	import Card from '$lib/components/Card.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import Icon from '@iconify/svelte';
	import { getLocale } from '$lib/paraglide/runtime.js';
	
	// i18n
	import { m } from '$lib/paraglide/messages.js';

	// Model settings state
	let openRouterApiKey = $state('');
	let selectedModel = $state('openai/gpt-5-chat');
	let temperature = $state(0.7);
	let maxTokens = $state(8192);
	let testingConnection = $state(false);
	let connectionStatus = $state<'idle' | 'success' | 'error'>('idle');
	let connectionMessage = $state('');
	let loadingModels = $state(false);
	let initialLoadComplete = $state(false);

	// List of featured model IDs - data will be copied from academic API results
	const featuredModelIds = [
		'openai/gpt-5-chat',
		'anthropic/claude-sonnet-4',
		'google/gemini-2.5-pro',
	];

	// Academic models from OpenRouter
	let academicModels = $state<any[]>([]);
	
	// Featured models with complete data from academic API
	let featuredModels = $derived(() => {
		const featuredIds = new Set(featuredModelIds);
		return academicModels
			.filter(model => featuredIds.has(model.id))
			.map(model => {
				const providerId = model.name.split(':')[0];
				return {
					...model,
					provider: providerId,
					category: 'Popular'
				};
			});
	});

	// Non-featured academic models  
	let otherModels = $derived(() => {
		return academicModels
			.map(model => {
				const providerId = model.name.split(':')[0];
				return {
					...model,
					name: model.name,
					provider: providerId,
					category: providerId
				};
			});
	});

	let freeModels = $derived(() => {
		return [
			{
				id: 'openai/gpt-oss-20b:free',
				name: 'OpenAI: GPT-OSS 20B',
				pricing: {
					"prompt": "0",
					"completion": "0",
					"request": "0",
					"image": "0",
					"audio": "0",
					"web_search": "0",
					"internal_reasoning": "0",
					"input_cache_read": "0",
					"input_cache_write": "0"
				},
				provider: "OpenAI",
				category: 'Free'
			}
		]
	});

	// All models combined
	let allModels = $derived([...featuredModels(), ...otherModels(), ...freeModels()]);

	// Group models by category for dropdown
	let modelsByCategory = $derived(() => {
		const grouped: Record<string, any[]> = {};
		
		allModels.forEach(model => {
			const category = model.category;
			if (!grouped[category]) {
				grouped[category] = [];
			}
			grouped[category].push(model);
		});

		// Sort categories (Popular first, then alphabetically)
		const sortedCategories: Record<string, any[]> = {};
		const categoryOrder = Object.keys(grouped).sort((a, b) => {
			if (a === 'Popular') return -1;
			if (b === 'Popular') return 1;
			return a.localeCompare(b);
		});

		categoryOrder.forEach(category => {
			sortedCategories[category] = grouped[category].sort((a, b) => a.name.localeCompare(b.name));
		});

		return sortedCategories;
	});


	// Load settings from localStorage on mount
	onMount(() => {
		loadSettings();
		fetchAcademicModels();
	});

	function loadSettings() {
		try {
			const saved = localStorage.getItem('paperwriter-settings');
			if (saved) {
				const settings = JSON.parse(saved);
				openRouterApiKey = settings.openRouterApiKey || '';
				selectedModel = settings.selectedModel || 'openai/gpt-5-chat';
				temperature = settings.temperature !== undefined ? settings.temperature : 0.7;
				maxTokens = settings.maxTokens || 8192;
			}
			initialLoadComplete = true;
		} catch (error) {
			console.error('Failed to load settings:', error);
			initialLoadComplete = true;
		}
	}

	async function fetchAcademicModels() {
		loadingModels = true;
		try {
			// Check cache first
			const cached = getCachedModels();
			if (cached) {
				academicModels = cached;
				loadingModels = false;
				return;
			}

			const url = 'https://openrouter.ai/api/v1/models?category=academia';
			const options = { method: 'GET' };
			
			const response = await fetch(url, options);
			const data = await response.json();
			
			if (data.data && Array.isArray(data.data)) {
				// Store all academic models with basic processing
				const processedModels = data.data.map((model: any) => ({
					id: model.id,
					name: model.name || model.id.split('/').pop(),
					context_length: model.context_length,
					pricing: model.pricing
				}));
				
				academicModels = processedModels;
				
				// Cache the results
				cacheModels(processedModels);
			}
		} catch (error) {
			console.error('Failed to fetch academic models:', error);
			// Try to use cached models even if they're expired in case of network error
			const cached = getCachedModels(true);
			if (cached) {
				academicModels = cached;
			}
		} finally {
			loadingModels = false;
		}
	}

	function getCachedModels(ignoreExpiry = false): any[] | null {
		try {
			const cached = localStorage.getItem('paperwriter-cached-models');
			if (!cached) return null;

			const { models, timestamp } = JSON.parse(cached);
			const now = Date.now();
			const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

			// Check if cache is expired (unless ignoreExpiry is true for error fallback)
			if (!ignoreExpiry && now - timestamp > oneDay) {
				localStorage.removeItem('paperwriter-cached-models');
				return null;
			}

			return models;
		} catch (error) {
			console.error('Failed to load cached models:', error);
			return null;
		}
	}

	function cacheModels(models: any[]) {
		try {
			const cacheData = {
				models,
				timestamp: Date.now()
			};
			localStorage.setItem('paperwriter-cached-models', JSON.stringify(cacheData));
		} catch (error) {
			console.error('Failed to cache models:', error);
		}
	}

	function saveSettings(includeApiKey = false) {
		try {
			const settings: any = {
				selectedModel,
				temperature,
				maxTokens,
				lastUpdated: new Date().toISOString()
			};
			
			// Only include API key if explicitly requested (e.g., after successful test)
			if (includeApiKey) {
				settings.openRouterApiKey = openRouterApiKey;
			} else {
				// Preserve existing API key from localStorage if not including it
				const existing = localStorage.getItem('paperwriter-settings');
				if (existing) {
					const existingSettings = JSON.parse(existing);
					if (existingSettings.openRouterApiKey) {
						settings.openRouterApiKey = existingSettings.openRouterApiKey;
					}
				}
			}
			
			localStorage.setItem('paperwriter-settings', JSON.stringify(settings));
		} catch (error) {
			console.error('Failed to save settings:', error);
		}
	}

	async function testApiConnection() {
		if (!openRouterApiKey.trim()) {
			connectionStatus = 'error';
			connectionMessage = m.settings_enter_api_key();
			return;
		}

		testingConnection = true;
		connectionStatus = 'idle';

		try {
			const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${openRouterApiKey}`,
					'HTTP-Referer': window.location.origin,
					'X-Title': 'Paper Writer Assistant'
				}
			});

			if (response.ok) {
				connectionStatus = 'success';
				connectionMessage = m.settings_api_key_valid();
				// Save settings including the API key on successful test
				saveSettings(true);
			} else {
				const errorData = await response.json().catch(() => ({}));
				connectionStatus = 'error';
				connectionMessage = errorData.error?.message || m.settings_invalid_api_key({ status: response.status });
			}
		} catch (error) {
			connectionStatus = 'error';
			connectionMessage = m.settings_network_error({ error: error instanceof Error ? error.message : m.settings_unknown_error() });
		} finally {
			testingConnection = false;
		}
	}

	// Auto-save settings when they change (but not during initial load)
	// Note: API key is excluded and only saved on successful connection test
	$effect(() => {
		// Track settings variables (excluding API key)
		selectedModel;
		temperature;
		maxTokens;
		
		if (initialLoadComplete) {
			saveSettings(false); // Don't include API key in auto-save
		}
	});

	// Force reactivity when language changes
	$effect(() => {
		getLocale(); // Subscribe to language changes
	});
</script>

<div class="max-w-7xl mx-auto px-6 py-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-semibold text-gray-900 mb-2">{m.settings_page_title()}</h1>
		<p class="text-gray-600">{m.settings_page_description()}</p>
	</div>

	<!-- Model Settings Content -->
	<div class="mt-6">
		<Card>
			{#snippet header()}
				<h3 class="text-lg font-semibold text-gray-900">{m.settings_model_settings()}</h3>
				<p class="text-sm text-gray-600 mt-1">{m.settings_model_settings_description()}</p>
			{/snippet}

			<div class="space-y-8">
				<!-- API Configuration Section -->
				<div>
					<Heading level="h4" size="md" class="mb-4">
						{m.settings_api_configuration()}
					</Heading>
					
					<div class="space-y-4">
						<Input
							bind:value={openRouterApiKey}
							type="password"
							label={m.settings_api_key_label()}
							placeholder={m.settings_api_key_placeholder()}
							helpText={m.settings_api_key_help()}
							required
						/>

						<div class="flex items-center space-x-3">
							<Button
								onclick={testApiConnection}
								disabled={testingConnection || !openRouterApiKey.trim()}
								variant="secondary"
								iconLeft={testingConnection ? "heroicons:arrow-path" : "heroicons:signal"}
							>
								{testingConnection ? m.settings_testing() : m.settings_test_connection()}
							</Button>

							{#if connectionStatus !== 'idle'}
								<div class="flex items-center space-x-2">
									{#if connectionStatus === 'success'}
										<Icon icon="heroicons:check-circle" class="w-5 h-5 text-green-600" />
										<span class="text-sm text-green-600">{connectionMessage}</span>
									{:else if connectionStatus === 'error'}
										<Icon icon="heroicons:x-circle" class="w-5 h-5 text-red-600" />
										<span class="text-sm text-red-600">{connectionMessage}</span>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>

				<hr class="border-gray-200" />

				<!-- Model Selection Section -->
				<div>
					<Heading level="h4" size="md" class="mb-4">
						{m.settings_model_selection()}
						{#if loadingModels}
							<Icon icon="heroicons:arrow-path" class="w-4 h-4 animate-spin inline-block ml-2" />
						{/if}
					</Heading>
					
					<div class="space-y-4">
						<div>
							{#if loadingModels}
								<Select
									bind:value={selectedModel}
									label={m.settings_choose_model()}
									disabled={true}
									placeholder={m.settings_loading_models()}
								/>
							{:else if allModels.length === 0}
								<Select
									bind:value={selectedModel}
									label={m.settings_choose_model()}
									disabled={true}
									placeholder={m.settings_no_models_available()}
								/>
							{:else}
								<Select
									bind:value={selectedModel}
									label={m.settings_choose_model()}
									optionGroups={Object.entries(modelsByCategory()).map(([category, models]) => ({
										label: category,
										options: models.map(model => ({ value: model.id, label: model.name }))
									}))}
								/>
							{/if}
						</div>

						<!-- Selected Model Information -->
						{#if selectedModel}
							{@const currentModel = allModels.find(m => m.id === selectedModel)}
							{#if currentModel}
								<div class="bg-secondary-50 p-4 rounded-lg border border-secondary-200">
									<h5 class="text-sm font-medium text-secondary-900 mb-2">{m.settings_selected_model_info()}</h5>
									<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
										<div>
											<span class="font-medium text-secondary-700">{m.settings_provider_label()}:</span>
											<span class="text-secondary-600">{currentModel.provider}</span>
										</div>
										<div>
											<span class="font-medium text-secondary-700">{m.settings_model_label()}:</span>
											<span class="text-secondary-600">{currentModel.name}</span>
										</div>
										<div class="md:col-span-2">
											<span class="font-medium text-secondary-700">{m.settings_id_label()}:</span>
											<span class="text-secondary-600 font-mono text-xs">{currentModel.id}</span>
										</div>
										{#if currentModel.context_length}
											<div>
												<span class="font-medium text-secondary-700">{m.settings_context_length_label()}:</span>
												<span class="text-secondary-600">{m.settings_tokens_count({ count: currentModel.context_length.toLocaleString() })}</span>
											</div>
										{/if}
									</div>
								</div>
							{/if}
						{/if}
					</div>
				</div>

				<hr class="border-gray-200" />

				<!-- Model Parameters Section -->
				<div>
					<Heading level="h4" size="md" class="mb-4">
						{m.settings_generation_parameters()}
					</Heading>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<div class="flex">
								<Label for="temperature">
									{m.settings_temperature_label()}: <span class="font-medium">{temperature}</span>
								</Label>
							</div>
							<input
								id="temperature"
								type="range"
								min="0"
								max="2"
								step="0.1"
								bind:value={temperature}
								class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
							/>
							<div class="flex justify-between text-xs text-gray-500 mt-1">
								<span>{m.settings_deterministic()}</span>
								<span>{m.settings_creative()}</span>
							</div>
							<p class="text-sm text-gray-500 mt-1">{m.settings_temperature_description()}</p>
						</div>

						<div>
							<Label for="max-tokens">
								{m.settings_max_tokens_label()}
							</Label>
							<input
								id="max-tokens"
								type="number"
								min="1"
								max="32768"
								step="1"
								bind:value={maxTokens}
								class="block w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
							/>
							<p class="text-sm text-gray-500 mt-1">{m.settings_max_tokens_description()}</p>
						</div>
					</div>
				</div>
			</div>
		</Card>
	</div>
</div>