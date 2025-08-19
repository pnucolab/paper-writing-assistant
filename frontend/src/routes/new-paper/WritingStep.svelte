<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/Card.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import Button from '$lib/components/Button.svelte';
	import Icon from '@iconify/svelte';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';

    // i18n
    import { m } from '$lib/paraglide/messages.js';

    import type { Citation } from './common';
	import { getSectionWritingPrompt, type CitationContext } from './prompts';
	import { generateReferencesSection } from '$lib/utils/citations';
	import { OpenRouterClient, getOpenRouterSettings } from '$lib/utils/openRouter';

    // Props
    let { 
        citations, 
        onPreviousStep
    }: { 
        citations: Citation[]; 
        onPreviousStep: () => void;
    } = $props();

	// State
	let writingStarted = $state(false);
	let isGeneratingSection = $state(false);
	let generatedReferences = $state('');
	let generatedContent = $state(''); // Keep for now, will be replaced by combined sections
	let sectionAllocations = $state<Array<{sectionTitle: string; wordCount: number}>>([]);
	let generatedSections = $state<Array<{title: string; content: string; wordCount: number}>>([]);
	let currentSectionIndex = $state(0);
	let isFinished = $state(false);
	
	// Combine generated sections into single content for display
	$effect(() => {
		if (generatedSections.length > 0) {
			generatedContent = generatedSections.map(section => section.content).join('\n\n');
		}
	});

	// Paper data
	let paperTitle = $state('');
	let paperType = $state('research');
	let targetLength = $state(5000);
	let paperOutline = $state<Array<{title: string; bulletPoints: string[]; citationIndices: number[]; wordCount: number}>>([]);
	let researchFocus = $state('');
	
	// Format data for citation style
	let singleCitationExample = $state('');
	let multipleCitationExample = $state('');
	let referenceCitationExample = $state('');
	let citationStyle = $state<'apa' | 'mla' | 'chicago' | 'harvard' | 'ieee'>('apa');
	let includeDoi = $state(true);
	let targetLanguage = $state('English');

	// OpenRouter client
	let openRouterClient: OpenRouterClient | null = null;

	async function startAIWriting() {
		if (!openRouterClient) {
			alert(m.writing_api_key_not_configured());
			return;
		}

		// Clear all previous content first
		writingStarted = true;
		generatedReferences = '';
		generatedContent = '';
		generatedSections = [];
		sectionAllocations = [];
		currentSectionIndex = 0;
		isFinished = false;

		try {
			const settings = getOpenRouterSettings();
			if (!settings?.apiKey) {
				throw new Error(m.writing_api_key_not_configured());
			}

			// Step 1: Allocate Section Lengths
			loadSectionAllocations();

			// Step 2: Generate Sections Sequentially
			await generateSectionsSequentially(settings);

			// Step 3: Generate References Section (programmatically)
			generatedReferences = generateReferencesSection(citations, citationStyle, includeDoi);

			isFinished = true;
		} catch (error) {
			console.error('Failed to generate paper:', error);
			alert(m.writing_generation_failed({ error: error instanceof Error ? error.message : m.writing_unknown_error() }));
		} finally {
			isGeneratingSection = false;
		}
	}

	function loadSectionAllocations() {
		// Load section allocations from paperOutline (which includes wordCount)
		sectionAllocations = paperOutline.map(section => ({
			sectionTitle: section.title,
			wordCount: section.wordCount
		}));
	}

	async function generateSectionsSequentially(settings: any) {
		for (let i = 0; i < paperOutline.length; i++) {
			currentSectionIndex = i;
			isGeneratingSection = true;

			const section = paperOutline[i];
			const allocation = sectionAllocations.find(alloc => alloc.sectionTitle === section.title);
			const wordCount = allocation?.wordCount || Math.floor(targetLength / paperOutline.length);

			// Build previous sections context
			const previousSections = generatedSections.slice(0, i).map(sec => sec.content).join('\n\n');

			// Build citation context for this section
			const citationsContext: CitationContext[] = citations.map(citation => ({
				title: citation.title,
				authors: Array.isArray(citation.authors) ? citation.authors.join(', ') : citation.authors,
				year: citation.year,
				abstract: citation.abstract || 'No abstract available'
			}));

			const sectionSystemPrompt = getSectionWritingPrompt(
				paperTitle,
				paperType,
				section.title,
				wordCount,
				section.bulletPoints,
				section.citationIndices,
				citationsContext,
				singleCitationExample,
				multipleCitationExample,
				researchFocus,
				previousSections || undefined,
				targetLanguage
			);
			const sectionUserPrompt = `Write the "${section.title}" section with approximately ${wordCount} words.`;

			let sectionContent = '';
			await openRouterClient!.chatCompletionStream(
				sectionSystemPrompt,
				sectionUserPrompt,
				(chunk: string) => {
					sectionContent += chunk;
					// Update the current section being generated
					const updatedSections = [...generatedSections];
					if (updatedSections[i]) {
						updatedSections[i].content = sectionContent;
					} else {
						updatedSections[i] = { title: section.title, content: sectionContent, wordCount };
					}
					generatedSections = updatedSections;
				},
				{
					model: settings.model,
					temperature: settings.temperature,
					max_tokens: settings.maxTokens
				}
			);

			// Finalize the section
			generatedSections[i] = { title: section.title, content: sectionContent, wordCount };
		}

		isGeneratingSection = false;
	}

	function finishWriting() {
		// Save draft to localStorage
		try {
			// Combine title, main content and references
			const titleSection = `# ${paperTitle}\n\n`;
			const fullContent = titleSection + generatedContent + '\n\n' + generatedReferences;
			
			const draft = {
				id: `draft-${Date.now()}`,
				title: paperTitle,
				content: fullContent,
				paperType,
				targetLength,
				citations,
				createdAt: new Date().toISOString(),
				lastModified: new Date().toISOString(),
				// Extended data for chat session
				researchFocus,
				paperOutline,
				formatSettings: {
					citationStyle,
					includeDoi,
					singleCitationExample,
					multipleCitationExample,
					referenceCitationExample
				},
				sectionAllocations,
				generationMetadata: {
					sectionsGenerated: generatedSections.length,
					totalSections: paperOutline.length,
					referencesCount: citations.length
				}
			};
			
			// Get existing drafts or create new array
			const existingDrafts = JSON.parse(localStorage.getItem('paperwriter-drafts') || '[]');
			existingDrafts.push(draft);
			localStorage.setItem('paperwriter-drafts', JSON.stringify(existingDrafts));

			// Clear workflow data
			localStorage.removeItem('paperwriter-paper-format');
			localStorage.removeItem('paperwriter-documents');
			localStorage.removeItem('paperwriter-focus');
			localStorage.removeItem('paperwriter-outline-paper');

			// Navigate to drafts page
			alert(m.writing_draft_saved_success());
			window.location.href = `/drafts?id=${draft.id}`;
		} catch (error) {
			console.error('Failed to save draft:', error);
			alert(m.writing_draft_save_failed());
		}
	}

	function proceedToPreviousStep() {
		onPreviousStep();
	}

	function loadPaperData() {
		try {
			// Load paper title and outline
			const outlineSaved = localStorage.getItem('paperwriter-outline-paper');
			if (outlineSaved) {
				const outlineData = JSON.parse(outlineSaved);
				paperTitle = outlineData.title || 'Untitled Paper';
				paperOutline = outlineData.paperOutline || [];
			}

			// Load paper format
			const formatSaved = localStorage.getItem('paperwriter-paper-format');
			if (formatSaved) {
				const formatData = JSON.parse(formatSaved);
				paperType = formatData.paperType || 'research';
				targetLength = formatData.targetLength || 5000;
				targetLanguage = formatData.targetLanguage || 'English';
				singleCitationExample = formatData.singleCitationExample || '';
				multipleCitationExample = formatData.multipleCitationExample || '';
				referenceCitationExample = formatData.referenceCitationExample || '';
				citationStyle = formatData.citationStyle || 'apa';
				includeDoi = formatData.includeDoi !== undefined ? formatData.includeDoi : true;
			}

			// Load research focus
			const focusSaved = localStorage.getItem('paperwriter-focus');
			if (focusSaved) {
				const focusData = JSON.parse(focusSaved);
				researchFocus = focusData.researchFocus || '';
			}

			// Citations are now used directly with full information
		} catch (error) {
			console.error('Failed to load paper data:', error);
		}
	}

	onMount(() => {
		loadPaperData();
		
		// Initialize OpenRouter client
		const settings = getOpenRouterSettings();
		if (settings?.apiKey) {
			openRouterClient = new OpenRouterClient({
				apiKey: settings.apiKey,
				siteUrl: window.location.origin,
				siteName: 'Paper Writer Assistant'
			});
		}
	});
</script>

<!-- Writing Step -->
<div class="space-y-6">
    <!-- AI Writing Interface -->
    <Card>
        {#snippet header()}
            <div class="flex items-center justify-between">
                <div>
                    <Heading level="h3" size="lg">
                        {#if !writingStarted}
                            {m.writing_ready_to_write({ title: paperTitle || m.writing_untitled_paper() })}
                        {:else if isGeneratingSection}
                            {m.writing_section_progress({ current: currentSectionIndex + 1, total: paperOutline.length })}
                        {:else if isFinished}
                            {m.writing_complete()}
                        {:else}
                            {m.writing_ai_assisted()}
                        {/if}
                    </Heading>
                    <p class="text-secondary-600 mt-1">
                        {#if !writingStarted}
                            {m.writing_start_description({ paperType })}
                        {:else if isGeneratingSection}
                            {m.writing_sequential_description()}
                        {:else if isFinished}
                            {m.writing_generation_success()}
                        {:else}
                            {m.writing_interface_description()}
                        {/if}
                    </p>
                </div>
                
                {#if isFinished}
                    <div class="flex items-center space-x-3">
                        <Button
                            onclick={startAIWriting}
                            variant="secondary"
                            iconLeft="heroicons:arrow-path"
                        >
                            {m.writing_regenerate_paper()}
                        </Button>
                        <Button
                            onclick={finishWriting}
                            variant="primary"
                            iconLeft="heroicons:check"
                        >
                            {m.writing_finish_save_draft()}
                        </Button>
                    </div>
                {/if}
            </div>
        {/snippet}

        <div class="space-y-6">
            {#if !writingStarted}
                <!-- Pre-writing overview -->
                <div class="space-y-4">
                    <div class="bg-secondary-50 rounded-lg p-4">
                        <h4 class="font-medium text-secondary-900 mb-2">{m.writing_paper_overview()}</h4>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span class="text-secondary-600">{m.writing_title_label()}:</span>
                                <span class="ml-2 font-medium">{paperTitle || m.writing_untitled_paper()}</span>
                            </div>
                            <div>
                                <span class="text-secondary-600">{m.writing_type_label()}:</span>
                                <span class="ml-2 font-medium capitalize">{paperType}</span>
                            </div>
                            <div>
                                <span class="text-secondary-600">{m.writing_target_length_label()}:</span>
                                <span class="ml-2 font-medium">{m.writing_words_count({ count: targetLength.toLocaleString() })}</span>
                            </div>
                            <div>
                                <span class="text-secondary-600">{m.writing_citations_label()}:</span>
                                <span class="ml-2 font-medium">{m.writing_references_count({ count: citations.length })}</span>
                            </div>
                        </div>
                    </div>

                    <div class="text-center py-8">
                        <Icon icon="heroicons:pencil-square" class="w-16 h-16 mx-auto mb-4 text-primary-600" />
                        <h3 class="text-lg font-medium text-secondary-900 mb-2">{m.writing_ready_to_generate()}</h3>
                        <p class="text-secondary-600 mb-6 max-w-md mx-auto">
                            {m.writing_generation_description()}
                        </p>
                        <Button
                            onclick={startAIWriting}
                            variant="primary"
                            size="lg"
                            iconLeft="heroicons:sparkles"
                            disabled={!paperTitle || paperOutline.length === 0}
                        >
                            {m.writing_start_ai_writing()}
                        </Button>
                        
                        {#if !paperTitle || paperOutline.length === 0}
                            <p class="text-sm text-amber-600 mt-2">
                                {m.writing_complete_outline_warning()}
                            </p>
                        {/if}
                    </div>
                </div>
            {:else}
                <!-- Writing interface -->
                <div class="space-y-4">
                    {#if isGeneratingSection}
                        <div class="text-center py-4">
                            <Icon icon="heroicons:arrow-path" class="w-8 h-8 mx-auto mb-2 text-primary-600 animate-spin" />
                            <p class="text-secondary-600">{m.writing_step_section_progress({ current: currentSectionIndex + 1, total: paperOutline.length })}</p>
                            <p class="text-sm text-secondary-500 mt-1">
                                {#if sectionAllocations.length > 0}
                                    {m.writing_current_section_with_words({ title: paperOutline[currentSectionIndex]?.title, words: sectionAllocations.find(alloc => alloc.sectionTitle === paperOutline[currentSectionIndex]?.title)?.wordCount || 0 })}
                                {:else}
                                    {m.writing_current_section({ title: paperOutline[currentSectionIndex]?.title })}
                                {/if}
                            </p>
                            
                            <!-- Section Progress Bar -->
                            <div class="mt-4 max-w-md mx-auto">
                                <div class="flex justify-between text-xs text-secondary-500 mb-1">
                                    <span>{m.writing_section_progress_label()}</span>
                                    <span>{currentSectionIndex} / {paperOutline.length}</span>
                                </div>
                                <div class="w-full bg-secondary-200 rounded-full h-2">
                                    <div 
                                        class="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                                        style="width: {(currentSectionIndex / paperOutline.length) * 100}%"
                                    ></div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Section Status List -->
                        {#if sectionAllocations.length > 0}
                            <div class="mt-6 max-w-2xl mx-auto">
                                <h4 class="text-sm font-semibold text-secondary-700 mb-3">{m.writing_section_status()}</h4>
                                <div class="space-y-2">
                                    {#each paperOutline as section, index}
                                        {@const allocation = sectionAllocations.find(alloc => alloc.sectionTitle === section.title)}
                                        {@const isCompleted = index < currentSectionIndex}
                                        {@const isCurrent = index === currentSectionIndex}
                                        {@const isPending = index > currentSectionIndex}
                                        
                                        <div class="flex items-center justify-between p-3 rounded-lg border" 
                                             class:bg-green-50={isCompleted}
                                             class:border-green-200={isCompleted}
                                             class:bg-primary-50={isCurrent}
                                             class:border-primary-200={isCurrent}
                                             class:bg-secondary-50={isPending}
                                             class:border-secondary-200={isPending}>
                                            <div class="flex items-center space-x-3">
                                                {#if isCompleted}
                                                    <Icon icon="heroicons:check-circle" class="w-5 h-5 text-green-600" />
                                                {:else if isCurrent}
                                                    <Icon icon="heroicons:arrow-path" class="w-5 h-5 text-primary-600 animate-spin" />
                                                {:else}
                                                    <Icon icon="heroicons:clock" class="w-5 h-5 text-secondary-400" />
                                                {/if}
                                                <div>
                                                    <p class="font-medium text-sm" 
                                                       class:text-green-800={isCompleted}
                                                       class:text-primary-800={isCurrent}
                                                       class:text-secondary-600={isPending}>
                                                        {section.title}
                                                    </p>
                                                    <p class="text-xs text-secondary-500">
                                                        {m.writing_section_summary({ keyPoints: section.bulletPoints.length, citations: section.citationIndices.length })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div class="text-right">
                                                <p class="text-sm font-medium" 
                                                   class:text-green-700={isCompleted}
                                                   class:text-primary-700={isCurrent}
                                                   class:text-secondary-500={isPending}>
                                                    {allocation?.wordCount || 0}
                                                </p>
                                                <p class="text-xs text-secondary-500">{m.writing_words_label()}</p>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    {/if}

                    <!-- Generated content display -->
                    <div class="min-h-96 p-6 bg-white border border-secondary-200 rounded-lg">
                        {#if generatedContent || generatedReferences || isGeneratingSection || paperTitle}
                            <div class="prose prose-sm max-w-none">
                                <!-- Paper title -->
                                {#if paperTitle && (generatedContent || generatedReferences || isGeneratingSection)}
                                    <h1 class="text-2xl font-bold mb-8">{paperTitle}</h1>
                                {/if}
                                
                                <!-- Main content section -->
                                {#if generatedContent}
                                    <MarkdownRenderer content={generatedContent} />
                                {/if}
                                
                                <!-- References section -->
                                {#if generatedReferences}
                                    <MarkdownRenderer content={generatedReferences} />
                                {/if}
                                
                                <!-- Show section generation status -->
                                {#if isGeneratingSection && paperOutline[currentSectionIndex]}
                                    <div class="border-t border-secondary-200 pt-4 mt-4">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center space-x-2">
                                                <Icon icon="heroicons:arrow-path" class="w-4 h-4 animate-spin text-primary-600" />
                                                <span class="text-sm text-secondary-600">{m.writing_current_section_status({ title: paperOutline[currentSectionIndex].title })}</span>
                                            </div>
                                            <span class="text-xs text-secondary-500">
                                                {m.writing_section_counter({ current: currentSectionIndex + 1, total: paperOutline.length })}
                                            </span>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        {:else}
                            <div class="flex items-center justify-center h-32">
                                <div class="text-secondary-400">{m.writing_no_content_yet()}</div>
                            </div>
                        {/if}
                    </div>

                    {#if isFinished}
                        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div class="flex items-center">
                                <Icon icon="heroicons:check-circle" class="w-5 h-5 text-green-600 mr-2" />
                                <span class="text-sm font-medium text-green-800">{m.writing_paper_completed()}</span>
                            </div>
                            <p class="text-sm text-green-700 mt-1">
                                {m.writing_review_instruction()}
                            </p>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </Card>

    <!-- Navigation -->
    <div class="flex justify-between">
        <Button
            onclick={proceedToPreviousStep}
            variant="secondary"
            iconLeft="heroicons:arrow-left"
            disabled={isGeneratingSection}
        >
            {m.writing_back_to_outline()}
        </Button>
        
        {#if isFinished}
            <div class="flex items-center space-x-3">
                <Button
                    onclick={startAIWriting}
                    variant="secondary"
                    iconLeft="heroicons:arrow-path"
                >
                    {m.writing_regenerate_paper()}
                </Button>
                <Button
                    onclick={finishWriting}
                    variant="primary"
                    iconRight="heroicons:arrow-right"
                >
                    {m.writing_finish_save_draft()}
                </Button>
            </div>
        {/if}
    </div>
</div>