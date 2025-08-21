<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Label from '$lib/components/ui/Label.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Heading from '$lib/components/ui/Heading.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import Icon from '@iconify/svelte';
	import { getLocale } from '$lib/paraglide/runtime.js';
	
	// i18n
	import { m } from '$lib/paraglide/messages.js';

	// Import stores
	import {
		providerType,
		selectedModel,
		openRouterApiKey,
		customEndpoint,
		customApiKey,
		customModelName,
		modelParameters
	} from '$lib/stores/settings.js';
	
	// Import the type separately
	import type { ProviderType } from '$lib/stores/settings.js';

	// Local state for reactive updates
	let currentProviderType = $state<ProviderType>('openrouter');
	let currentOpenRouterApiKey = $state('');
	let currentSelectedModel = $state('openai/gpt-5-chat');
	let currentCustomEndpoint = $state('');
	let currentCustomApiKey = $state('');
	let currentCustomModelName = $state('');
	let currentTemperature = $state(0.7);
	let currentMaxTokens = $state(8192);

	// Initialize from stores and sync changes
	$effect(() => {
		// Load initial values from stores
		const unsubscribes = [
			providerType.subscribe(v => currentProviderType = v),
			openRouterApiKey.subscribe(v => currentOpenRouterApiKey = v),
			customEndpoint.subscribe(v => currentCustomEndpoint = v),
			customApiKey.subscribe(v => currentCustomApiKey = v),
			customModelName.subscribe(v => currentCustomModelName = v),
			selectedModel.subscribe(v => {
				if (v?.id) {
					currentSelectedModel = v.id;
				}
			}),
			modelParameters.subscribe(v => {
				currentTemperature = v.temperature;
				currentMaxTokens = v.maxTokens;
			})
		];

		// Cleanup subscriptions
		return () => unsubscribes.forEach(unsub => unsub());
	});

	// Sync local changes back to stores
	$effect(() => {
		providerType.set(currentProviderType);
	});

	$effect(() => {
		openRouterApiKey.set(currentOpenRouterApiKey);
	});

	$effect(() => {
		// Find the selected model from available models and update store
		if (currentSelectedModel && allModels.length > 0) {
			const model = allModels.find(m => m.id === currentSelectedModel);
			if (model) {
				selectedModel.set(model);
			}
		}
	});

	$effect(() => {
		customEndpoint.set(currentCustomEndpoint);
	});

	$effect(() => {
		customApiKey.set(currentCustomApiKey);
	});

	$effect(() => {
		customModelName.set(currentCustomModelName);
	});

	$effect(() => {
		modelParameters.set({
			temperature: currentTemperature,
			maxTokens: currentMaxTokens,
			topP: 1.0,
			frequencyPenalty: 0.0,
			presencePenalty: 0.0
		});
	});

	// UI state
	let testingConnection = $state(false);
	let connectionStatus = $state<'idle' | 'success' | 'error'>('idle');
	let connectionMessage = $state('');
	let loadingModels = $state(false);
	let initialLoadComplete = $state(false);

	// Featured model IDs
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
				const providerId = model.name?.split(':')[0] || model.id.split('/')[0];
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
				const providerId = model.name?.split(':')[0] || model.id.split('/')[0];
				return {
					...model,
					name: model.name || model.id,
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

	// Tab configuration
	const providerTabs = [
		{ id: 'openrouter', label: 'OpenRouter', icon: 'heroicons:globe-alt' },
		{ id: 'custom', label: 'Custom LLM', icon: 'heroicons:server' }
	];

	// Load settings from stores on mount
	onMount(() => {
		// Subscribe to stores and update local state
		providerType.subscribe(type => currentProviderType = type);
		openRouterApiKey.subscribe(key => currentOpenRouterApiKey = key);
		selectedModel.subscribe(model => currentSelectedModel = model?.id || 'openai/gpt-5-chat');
		customEndpoint.subscribe(endpoint => currentCustomEndpoint = endpoint || '');
		customApiKey.subscribe(key => currentCustomApiKey = key);
		customModelName.subscribe(name => currentCustomModelName = name || '');
		modelParameters.subscribe(params => {
			currentTemperature = params.temperature;
			currentMaxTokens = params.maxTokens;
		});

		fetchAcademicModels();
		initialLoadComplete = true;
	});

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
			const response = await fetch(url);
			const data = await response.json();
			
			if (data.data && Array.isArray(data.data)) {
				const processedModels = data.data.map((model: any) => ({
					id: model.id,
					name: model.name || model.id.split('/').pop(),
					context_length: model.context_length,
					pricing: model.pricing
				}));
				
				academicModels = processedModels;
				cacheModels(processedModels);
			}
		} catch (error) {
			console.error('Failed to fetch academic models:', error);
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
			const oneDay = 24 * 60 * 60 * 1000;

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
			const cacheData = { models, timestamp: Date.now() };
			localStorage.setItem('paperwriter-cached-models', JSON.stringify(cacheData));
		} catch (error) {
			console.error('Failed to cache models:', error);
		}
	}

	async function testApiConnection() {
		if (currentProviderType === 'openrouter') {
			if (!currentOpenRouterApiKey.trim()) {
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
						'Authorization': `Bearer ${currentOpenRouterApiKey}`,
						'HTTP-Referer': window.location.origin,
						'X-Title': 'Paper Writer Assistant'
					}
				});

				if (response.ok) {
					connectionStatus = 'success';
					connectionMessage = m.settings_api_key_valid();
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
		} else {
			// Test custom endpoint
			if (!currentCustomEndpoint.trim()) {
				connectionStatus = 'error';
				connectionMessage = 'Please enter an API endpoint';
				return;
			}

			testingConnection = true;
			connectionStatus = 'idle';

			try {
				const headers: Record<string, string> = {
					'Content-Type': 'application/json'
				};

				if (currentCustomApiKey.trim()) {
					headers['Authorization'] = `Bearer ${currentCustomApiKey}`;
				}

				const response = await fetch(`${currentCustomEndpoint.replace(/\/+$/, '')}/models`, {
					method: 'GET',
					headers
				});

				if (response.ok) {
					connectionStatus = 'success';
					connectionMessage = 'Custom endpoint is accessible!';
				} else {
					connectionStatus = 'error';
					connectionMessage = `HTTP ${response.status}: Unable to connect to custom endpoint`;
				}
			} catch (error) {
				connectionStatus = 'error';
				connectionMessage = `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`;
			} finally {
				testingConnection = false;
			}
		}
	}

	// Auto-save settings when they change (but not during initial load)
	$effect(() => {
		if (initialLoadComplete) {
			providerType.set(currentProviderType);
			openRouterApiKey.set(currentOpenRouterApiKey);
			customEndpoint.set(currentCustomEndpoint);
			customApiKey.set(currentCustomApiKey);
			customModelName.set(currentCustomModelName);
			modelParameters.update(params => ({
				...params,
				temperature: currentTemperature,
				maxTokens: currentMaxTokens
			}));
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

	<div class="space-y-8">
		<!-- Model Settings Card -->
		<Card>
			{#snippet header()}
				<h3 class="text-lg font-semibold text-gray-900">{m.settings_model_settings()}</h3>
				<p class="text-sm text-gray-600 mt-1">{m.settings_model_settings_description()}</p>
			{/snippet}

			<div class="space-y-6">
				<!-- Provider Selection Tabs -->
				<Tabs
					tabs={providerTabs.map(tab => ({
						id: tab.id,
						label: (m as any)[`settings_provider_${tab.id}`]()
					}))}
					activeTab={currentProviderType}
					onTabChange={(tabId) => currentProviderType = tabId as ProviderType}
				/>

				<!-- OpenRouter Tab Content -->
				{#if currentProviderType === 'openrouter'}
					<div class="space-y-4">
						<p class="text-sm text-gray-500">{m.settings_openrouter_tab_description()}</p>
						
						<Input
							bind:value={currentOpenRouterApiKey}
							type="password"
							label={m.settings_api_key_label()}
							placeholder={m.settings_api_key_placeholder()}
							helpText={m.settings_api_key_help()}
							required
						/>

						<div class="flex items-center space-x-3">
							<Button
								onclick={testApiConnection}
								disabled={testingConnection || !currentOpenRouterApiKey.trim()}
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

						<!-- Model Selection -->
						<div>
							<Label for="model-select">{m.settings_choose_model()}</Label>
							{#if loadingModels}
								<Select
									bind:value={currentSelectedModel}
									disabled={true}
									placeholder={m.settings_loading_models()}
								/>
							{:else if allModels.length === 0}
								<Select
									bind:value={currentSelectedModel}
									disabled={true}
									placeholder={m.settings_no_models_available()}
								/>
							{:else}
								<Select
									id="model-select"
									bind:value={currentSelectedModel}
									optionGroups={Object.entries(modelsByCategory()).map(([category, models]) => ({
										label: category,
										options: models.map(model => ({ value: model.id, label: model.name }))
									}))}
								/>
							{/if}
						</div>
					</div>

				<!-- Custom LLM Tab Content -->
				{:else if currentProviderType === 'custom'}
					<div class="space-y-4">
						<p class="text-sm text-gray-500">{m.settings_custom_tab_description()}</p>
						
						<Input
							bind:value={currentCustomEndpoint}
							label={m.settings_custom_endpoint_label()}
							placeholder={m.settings_custom_endpoint_placeholder()}
							helpText={m.settings_custom_endpoint_help()}
							required
						/>

						<Input
							bind:value={currentCustomApiKey}
							type="password"
							label={m.settings_custom_api_key_label()}
							placeholder={m.settings_custom_api_key_placeholder()}
							helpText={m.settings_custom_api_key_help()}
						/>

						<Input
							bind:value={currentCustomModelName}
							label={m.settings_custom_model_name_label()}
							placeholder={m.settings_custom_model_name_placeholder()}
							helpText={m.settings_custom_model_name_help()}
							required
						/>

						<div class="flex items-center space-x-3">
							<Button
								onclick={testApiConnection}
								disabled={testingConnection || !currentCustomEndpoint.trim()}
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
				{/if}

				<!-- Selected Model Information (only for OpenRouter) -->
				{#if currentProviderType === 'openrouter' && currentSelectedModel}
					{@const currentModel = allModels.find(m => m.id === currentSelectedModel)}
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
		</Card>

		<!-- Generation Parameters Card -->
		<Card>
			{#snippet header()}
				<h3 class="text-lg font-semibold text-gray-900">{m.settings_parameters_card_title()}</h3>
				<p class="text-sm text-gray-600 mt-1">{m.settings_parameters_card_description()}</p>
			{/snippet}

			<div class="space-y-6">
				<div>
					<div class="flex">
						<Label for="temperature">
							{m.settings_temperature_label()}: <span class="font-medium">{currentTemperature}</span>
						</Label>
					</div>
					<input
						id="temperature"
						type="range"
						min="0"
						max="2"
						step="0.1"
						bind:value={currentTemperature}
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
						bind:value={currentMaxTokens}
						class="block w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
					/>
					<p class="text-sm text-gray-500 mt-1">{m.settings_max_tokens_description()}</p>
				</div>
			</div>
		</Card>
	</div>
</div>