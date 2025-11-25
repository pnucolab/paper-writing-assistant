<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Label from '$lib/components/ui/Label.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import { Download, RotateCcw, Save, Search, FileText, ChevronDown, ChevronRight } from 'lucide-svelte';
	import { PROMPT_DEFINITIONS, type PromptTemplate, type PromptCategory } from '$lib/types/prompts';
	import { onMount } from 'svelte';

	let searchQuery = $state('');
	let expandedCategories = $state<Set<PromptCategory>>(new Set(['file-processing', 'focus', 'outline', 'writing', 'revision']));
	let selectedPromptId = $state<string | null>(null);
	let promptTemplates = $state<Record<string, PromptTemplate>>({});
	let customTemplates = $state<Record<string, string>>({});
	let isLoading = $state(false);

	// Load prompt templates from static files
	onMount(async () => {
		isLoading = true;
		try {
			// Load custom templates from localStorage
			const stored = localStorage.getItem('customPromptTemplates');
			if (stored) {
				customTemplates = JSON.parse(stored);
			}

			// Load all prompt templates
			for (const [id, definition] of Object.entries(PROMPT_DEFINITIONS)) {
				try {
					const response = await fetch(`/prompts/${definition.fileName}`);
					const text = await response.text();

					// Parse markdown file
					const lines = text.split('\n');
					let templateContent = '';
					let inFrontmatter = false;

					for (const line of lines) {
						if (line === '---') {
							if (!inFrontmatter) {
								inFrontmatter = true;
							} else {
								inFrontmatter = false;
							}
							continue;
						}
						if (!inFrontmatter && line !== '---') {
							templateContent += line + '\n';
						}
					}

					promptTemplates[id] = {
						...definition,
						template: templateContent.trim()
					};
				} catch (error) {
					console.error(`Failed to load prompt ${id}:`, error);
				}
			}
		} finally {
			isLoading = false;
		}
	});

	// Derived: filtered prompts based on search
	let filteredPrompts = $derived(() => {
		const query = searchQuery.toLowerCase();
		if (!query) return Object.values(promptTemplates);

		return Object.values(promptTemplates).filter(prompt =>
			prompt.metadata.name.toLowerCase().includes(query) ||
			prompt.metadata.description.toLowerCase().includes(query) ||
			prompt.id.toLowerCase().includes(query)
		);
	});

	// Group prompts by category (in workflow order)
	let promptsByCategory = $derived(() => {
		const prompts = filteredPrompts();
		const grouped: Record<PromptCategory, PromptTemplate[]> = {
			'file-processing': [],
			focus: [],
			outline: [],
			writing: [],
			revision: []
		};

		prompts.forEach(prompt => {
			grouped[prompt.metadata.category].push(prompt);
		});

		return grouped;
	});

	// Get category display name
	function getCategoryName(category: PromptCategory): string {
		const key = `prompts_category_${category.replace('-', '_')}` as any;
		return m[key]?.() || category;
	}

	// Toggle category expansion
	function toggleCategory(category: PromptCategory) {
		const newSet = new Set(expandedCategories);
		if (newSet.has(category)) {
			newSet.delete(category);
		} else {
			newSet.add(category);
		}
		expandedCategories = newSet;
	}

	// Get current template (custom or default)
	function getCurrentTemplate(promptId: string): string {
		return customTemplates[promptId] || promptTemplates[promptId]?.template || '';
	}

	// Check if prompt has custom template
	function hasCustomTemplate(promptId: string): boolean {
		return !!customTemplates[promptId];
	}

	// Save custom template
	function saveCustomTemplate(promptId: string) {
		const textarea = document.getElementById(`template-${promptId}`) as HTMLTextAreaElement;
		if (textarea) {
			customTemplates[promptId] = textarea.value;
			localStorage.setItem('customPromptTemplates', JSON.stringify(customTemplates));
		}
	}

	// Reset to default template
	function resetToDefault(promptId: string) {
		delete customTemplates[promptId];
		localStorage.setItem('customPromptTemplates', JSON.stringify(customTemplates));
		// Force update by reassigning
		customTemplates = { ...customTemplates };
	}

	// Download prompt as markdown file
	function downloadPrompt(promptId: string) {
		const prompt = promptTemplates[promptId];
		if (!prompt) return;

		const template = getCurrentTemplate(promptId);
		const content = `---
version: ${prompt.metadata.version}
name: ${prompt.metadata.name}
description: ${prompt.metadata.description}
---

${template}`;

		const blob = new Blob([content], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = prompt.fileName;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<div class="mb-8">
		<h1 class="text-3xl font-semibold mb-2">{m.prompts_title()}</h1>
		<p class="text-secondary-600">{m.prompts_description()}</p>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<p class="text-secondary-600">{m.loading()}</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
			<!-- Left sidebar: Prompt list -->
			<div class="lg:col-span-4">
				<Card title={m.prompts_list_title()} description={m.prompts_list_description()}>
					<!-- Search bar -->
					<div class="mb-4">
						<div class="relative">
							<Search class="absolute left-3 top-3 h-4 w-4 text-secondary-600" />
							<Input
								type="text"
								placeholder={m.prompts_search_placeholder()}
								class="pl-9"
								bind:value={searchQuery}
							/>
						</div>
					</div>

					<!-- Prompt list by category -->
					<div class="space-y-3">
						{#each Object.entries(promptsByCategory()) as [category, prompts]}
							{#if prompts.length > 0}
								<div class="space-y-1">
									<!-- Category header -->
									<button
										class="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-secondary-50 transition-colors"
										onclick={() => toggleCategory(category as PromptCategory)}
									>
										<div class="flex items-center gap-2">
											{#if expandedCategories.has(category as PromptCategory)}
												<ChevronDown class="h-4 w-4 text-secondary-600" />
											{:else}
												<ChevronRight class="h-4 w-4 text-secondary-600" />
											{/if}
											<span class="text-sm font-semibold text-secondary-900">
												{getCategoryName(category as PromptCategory)}
											</span>
										</div>
										<span class="text-xs text-secondary-600 px-2 py-0.5 rounded-full bg-secondary-100">
											{prompts.length}
										</span>
									</button>

									<!-- Category prompts -->
									{#if expandedCategories.has(category as PromptCategory)}
										<div class="space-y-1 pl-2">
											{#each prompts as prompt}
												<button
													class="w-full text-left p-3 rounded-lg border transition-colors {selectedPromptId === prompt.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-secondary-50 border-secondary-200'}"
													onclick={() => selectedPromptId = prompt.id}
												>
													<div class="flex items-start justify-between gap-2">
														<div class="flex-1 min-w-0">
															<div class="flex items-center gap-2 mb-1">
																<FileText class="h-4 w-4 shrink-0" />
																<p class="font-medium text-sm truncate">{prompt.metadata.name}</p>
															</div>
															<p class="text-xs text-secondary-600 line-clamp-2">
																{prompt.metadata.description}
															</p>
														</div>
														<div class="flex flex-col items-end gap-1 shrink-0">
															<span class="text-xs px-2 py-1 rounded border border-secondary-200 bg-white">{prompt.metadata.version}</span>
															{#if hasCustomTemplate(prompt.id)}
																<span class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">{m.prompts_custom()}</span>
															{/if}
														</div>
													</div>
												</button>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						{/each}

						{#if filteredPrompts().length === 0}
							<p class="text-sm text-secondary-600 text-center py-4">
								{m.prompts_no_results()}
							</p>
						{/if}
					</div>
				</Card>
			</div>

			<!-- Right panel: Prompt editor -->
			<div class="lg:col-span-8">
				{#if selectedPromptId && promptTemplates[selectedPromptId]}
					{@const prompt = promptTemplates[selectedPromptId]}
					<Card>
						{#snippet header()}
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<h3 class="text-lg font-semibold text-secondary-900">{prompt.metadata.name}</h3>
									<p class="text-sm text-secondary-600 mt-1">{prompt.metadata.description}</p>
									<div class="flex items-center gap-2 mt-2">
										<span class="text-xs text-secondary-600">{m.prompts_used_in()}:</span>
										<span class="text-xs px-2 py-1 rounded bg-secondary-100 text-secondary-700">{prompt.metadata.usedIn}</span>
									</div>
								</div>
								<span class="text-xs px-2 py-1 rounded border border-secondary-200 bg-white">{prompt.metadata.version}</span>
							</div>
						{/snippet}

						<div class="space-y-4">
							<!-- Template editor -->
							<div>
								<Label for="template-{prompt.id}">{m.prompts_template_label()}</Label>
								<TextArea
									id="template-{prompt.id}"
									class="min-h-[400px] font-mono text-sm mt-2"
									value={getCurrentTemplate(prompt.id)}
									placeholder={m.prompts_template_placeholder()}
								/>
								<p class="text-xs text-secondary-600 mt-2">
									{m.prompts_template_help()}
								</p>
							</div>

							<!-- Action buttons -->
							<div class="flex items-center gap-2 pt-4 border-t border-secondary-200">
								<Button onclick={() => saveCustomTemplate(prompt.id)}>
									<Save class="h-4 w-4 mr-2" />
									{m.prompts_save()}
								</Button>

								{#if hasCustomTemplate(prompt.id)}
									<Button variant="outline" onclick={() => resetToDefault(prompt.id)}>
										<RotateCcw class="h-4 w-4 mr-2" />
										{m.prompts_reset()}
									</Button>
								{/if}

								<Button variant="outline" onclick={() => downloadPrompt(prompt.id)}>
									<Download class="h-4 w-4 mr-2" />
									{m.prompts_download()}
								</Button>
							</div>
						</div>
					</Card>
				{:else}
					<Card>
						<div class="flex items-center justify-center py-12">
							<p class="text-secondary-600">{m.prompts_select_prompt()}</p>
						</div>
					</Card>
				{/if}
			</div>
		</div>
	{/if}
</div>
