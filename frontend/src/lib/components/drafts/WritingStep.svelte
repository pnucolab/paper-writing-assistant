<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Heading from '$lib/components/ui/Heading.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '@iconify/svelte';
	import MarkdownRenderer from '$lib/components/ui/MarkdownRenderer.svelte';
	import DownloadOptions from '$lib/components/ui/DownloadOptions.svelte';

    // i18n
    import { m } from '$lib/paraglide/messages.js';

    import type { Citation, CitationContext } from '$lib/stores/drafts';
	import { getSectionWritingPrompt, getFigureLegendsPrompt, getAIReviewerPrompt, getAIRevisorPrompt } from '$lib/utils/promptLoader';
	import { generateReferencesSection } from '$lib/utils/citations';
	import type { LLMClient } from '$lib/utils/llm';
	import { getUnifiedSettings } from '$lib/stores/settings';

    // Props
    let { 
        draftId,
        citations,
        llmClient,
        llmConfigError,
        onPreviousStep
    }: { 
        draftId: string;
        citations: Citation[];
        llmClient: LLMClient | null;
        llmConfigError: string | null;
        onPreviousStep: () => void;
    } = $props();

	// State
	let writingStarted = $state(false);
	let isGeneratingSection = $state(false);
	let generatedReferences = $state('');
	let generatedFigureLegends = $state('');
	let generatedContent = $state(''); // Keep for now, will be replaced by combined sections
	let sectionAllocations = $state<Array<{sectionTitle: string; wordCount: number}>>([]);
	let generatedSections = $state<Array<{title: string; content: string; wordCount: number}>>([]);
	let currentSectionIndex = $state(0);
	let isFinished = $state(false);
	let isRevising = $state(false);
	let currentRevisionIndex = $state(0);
	let revisedSections = $state<Array<{title: string; content: string; wordCount: number}>>([]);
	
	// File summaries from documents step
	let figureFiles = $state<{ name: string; summary?: string }[]>([]);
	let supplementaryFiles = $state<{ name: string; summary?: string }[]>([]);
	
	// Combine generated sections into single content for display
	$effect(() => {
		// Use revised sections if available, otherwise use generated sections
		const sectionsToUse = revisedSections.length > 0 ? revisedSections : generatedSections;
		if (sectionsToUse.length > 0) {
			const sectionsContent = sectionsToUse.map(section => section.content).join('\n\n');
			const figureLegendsSection = generatedFigureLegends ? '\n\n' + generatedFigureLegends : '';
			const combinedContent = sectionsContent + figureLegendsSection;
			// Normalize hyphens: replace non-breaking hyphens (‑) with regular hyphens (-)
			generatedContent = combinedContent.replace(/‑/g, '-');
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

	async function startAIWriting() {
		if (!llmClient || llmConfigError) {
			alert(m.writing_api_key_not_configured());
			return;
		}

		// Clear all previous content first
		writingStarted = true;
		generatedReferences = '';
		generatedFigureLegends = '';
		generatedContent = '';
		generatedSections = [];
		revisedSections = [];
		sectionAllocations = [];
		currentSectionIndex = 0;
		currentRevisionIndex = 0;
		isFinished = false;
		isRevising = false;

		try {
			// Step 1: Allocate Section Lengths
			loadSectionAllocations();

			// Step 2: Generate Sections Sequentially
			await generateSectionsSequentially();

			// Step 3: Generate Figure Legends Section (if figures provided)
			generatedFigureLegends = await generateFigureLegendsSection(figureFiles);

			// Step 4: Generate References Section (programmatically)
			const rawReferences = generateReferencesSection(citations, citationStyle, includeDoi);
			// Normalize hyphens in references
			generatedReferences = rawReferences.replace(/‑/g, '-');

			isFinished = true;
			
			// Auto-save draft when generation is complete
			await autoSaveDraft();
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

	async function generateSectionsSequentially() {
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

			const sectionSystemPrompt = await getSectionWritingPrompt(
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
				targetLanguage,
				figureFiles,
				supplementaryFiles
			);
			const sectionUserPrompt = `Write the "${section.title}" section with approximately ${wordCount} words.`;

			let sectionContent = '';
			await llmClient!.chatCompletionStream(
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
				}
			);

			// Finalize the section
			generatedSections[i] = { title: section.title, content: sectionContent, wordCount };
		}

		isGeneratingSection = false;
	}

	async function generateFigureLegendsSection(figureFiles: { name: string; summary?: string }[]): Promise<string> {
		if (!figureFiles || figureFiles.length === 0) {
			return '';
		}

		const figuresWithSummary = figureFiles.filter(file => file.summary);
		if (figuresWithSummary.length === 0) {
			return '';
		}

		if (!llmClient) {
			// Fallback to simple legends if no LLM client
			let legendsContent = '## Figure Legends\n\n';
			figuresWithSummary.forEach((figure, index) => {
				const figureNumber = index + 1;
				legendsContent += `**Figure ${figureNumber}.** ${figure.summary}\n\n`;
			});
			return legendsContent;
		}

		try {
			// Generate AI-powered figure legends
			const systemPrompt = await getFigureLegendsPrompt(figureFiles, targetLanguage);
			const userPrompt = `Generate professional academic figure legends for the ${figuresWithSummary.length} provided figures.`;

			let legendsContent = '';
			await llmClient.chatCompletionStream(
				systemPrompt,
				userPrompt,
				(chunk) => {
					legendsContent += chunk;
					// Update the state for real-time display
					generatedFigureLegends = legendsContent;
				},
				{
					onComplete: () => {
						generatedFigureLegends = legendsContent;
					},
					onError: (error: any) => {
						console.error('Error generating figure legends:', error);
						// Fallback to simple legends on error
						let fallbackContent = '## Figure Legends\n\n';
						figuresWithSummary.forEach((figure, index) => {
							const figureNumber = index + 1;
							fallbackContent += `**Figure ${figureNumber}.** ${figure.summary}\n\n`;
						});
						generatedFigureLegends = fallbackContent;
						legendsContent = fallbackContent;
					}
				}
			);

			return legendsContent;
		} catch (error) {
			console.error('Failed to generate AI figure legends:', error);
			// Fallback to simple legends
			let legendsContent = '## Figure Legends\n\n';
			figuresWithSummary.forEach((figure, index) => {
				const figureNumber = index + 1;
				legendsContent += `**Figure ${figureNumber}.** ${figure.summary}\n\n`;
			});
			return legendsContent;
		}
	}

	async function autoSaveDraft() {
		// Auto-save writing content and mark draft as completed
		try {
			// Combine title, main content, figure legends, and references
			const titleSection = `# ${paperTitle}\n\n`;
			const figureLegendsSection = generatedFigureLegends ? generatedFigureLegends + '\n\n' : '';
			const fullContent = titleSection + generatedContent + '\n\n' + figureLegendsSection + generatedReferences;
			
			// Get current model information at time of writing
			const settings = getUnifiedSettings();
			let modelName = 'Unknown';
			let providerType = 'unknown';
			
			if (settings) {
				providerType = settings.providerType;
				if (settings.providerType === 'openrouter' && settings.openrouter.selectedModel) {
					modelName = settings.openrouter.selectedModel.name;
				} else if (settings.providerType === 'custom' && settings.custom.modelName) {
					modelName = settings.custom.modelName;
				}
			}

			// Save to writing step storage
			const writingData = {
				content: fullContent,
				paperContent: fullContent, // For backward compatibility
				sectionAllocations,
				generatedSections,
				revisedSections, // Save revised sections
				generatedReferences,
				generatedFigureLegends,
				modelName, // Save model info at top level for transparency report
				providerType, // Save provider info at top level for transparency report
				generationMetadata: {
					sectionsGenerated: generatedSections.length,
					sectionsRevised: revisedSections.length,
					totalSections: paperOutline.length,
					referencesCount: citations.length,
					completedAt: new Date().toISOString()
				},
				lastSaved: new Date().toISOString()
			};
			
			localStorage.setItem(`paperwriter-draft-${draftId}-writing`, JSON.stringify(writingData));

			// Mark draft as completed in main drafts list
			const existingDrafts = JSON.parse(localStorage.getItem('paperwriter-drafts') || '[]');
			const draftIndex = existingDrafts.findIndex((d: any) => d.id === draftId);
			
			if (draftIndex !== -1) {
				existingDrafts[draftIndex].isCompleted = true;
				existingDrafts[draftIndex].currentStep = 'writing';
				existingDrafts[draftIndex].lastModified = new Date().toISOString();
				localStorage.setItem('paperwriter-drafts', JSON.stringify(existingDrafts));
			}

			console.log('Draft auto-saved successfully to:', `paperwriter-draft-${draftId}-writing`);
			console.log('Writing data saved:', {
				contentLength: fullContent.length,
				sectionsCount: generatedSections.length,
				referencesLength: generatedReferences.length,
				isCompleted: true
			});
		} catch (error) {
			console.error('Failed to auto-save draft:', error);
		}
	}

	function finishWriting() {
		// Navigate to revisions page for editing
		try {
			// Show success message and redirect
			alert(m.writing_draft_saved_success());
			window.location.href = `/revisions?id=${draftId}`;
		} catch (error) {
			console.error('Failed to navigate to revisions:', error);
		}
	}

	function proceedToPreviousStep() {
		onPreviousStep();
	}

	function loadPaperData() {
		try {
			// Load paper title and outline
			const outlineSaved = localStorage.getItem(`paperwriter-draft-${draftId}-outline`);
			if (outlineSaved) {
				const outlineData = JSON.parse(outlineSaved);
				paperTitle = outlineData.title || 'Untitled Paper';
				paperOutline = outlineData.paperOutline || [];
			}

			// Load paper format
			const formatSaved = localStorage.getItem(`paperwriter-draft-${draftId}-format`);
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
			const focusSaved = localStorage.getItem(`paperwriter-draft-${draftId}-focus`);
			if (focusSaved) {
				const focusData = JSON.parse(focusSaved);
				researchFocus = focusData.researchFocus || '';
			}

			// Load figure files and supplementary data from documents step
			try {
				const documentsData = localStorage.getItem(`paperwriter-draft-${draftId}-documents`);
				if (documentsData) {
					const documents = JSON.parse(documentsData);
					
					// Load figure files with summaries
					if (documents.figureFiles) {
						figureFiles = documents.figureFiles
							.filter((file: any) => file.summary) // Only include files with summaries
							.map((file: any) => ({
								name: file.name,
								summary: file.summary
							}));
					}
					
					// Load supplementary files with summaries
					if (documents.uploadedFiles) {
						supplementaryFiles = documents.uploadedFiles
							.filter((file: any) => file.summary) // Only include files with summaries
							.map((file: any) => ({
								name: file.name,
								summary: file.summary
							}));
					}
				}
			} catch (error) {
				console.error('Failed to load documents data:', error);
			}

			// Load previously generated writing content if it exists
			const writingSaved = localStorage.getItem(`paperwriter-draft-${draftId}-writing`);
			if (writingSaved) {
				const writingData = JSON.parse(writingSaved);
				
				// Restore writing state
				writingStarted = true;
				isFinished = true;
				generatedReferences = writingData.generatedReferences || '';
				generatedFigureLegends = writingData.generatedFigureLegends || '';
				sectionAllocations = writingData.sectionAllocations || [];
				generatedSections = writingData.generatedSections || [];
				revisedSections = writingData.revisedSections || [];
				
				// The $effect will automatically update generatedContent from generatedSections
				
				console.log('Restored writing content from localStorage:', {
					sectionsCount: generatedSections.length,
					referencesLength: generatedReferences.length,
					hasContent: !!writingData.content
				});
			}

			// Citations are now used directly with full information
		} catch (error) {
			console.error('Failed to load paper data:', error);
		}
	}

	onMount(() => {
		loadPaperData();
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
                        {:else if isRevising}
                            Revising Section {currentRevisionIndex + 1} of {generatedSections.length}
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
                                    <MarkdownRenderer content={generatedContent} class="mb-4" />
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
                        <div class="space-y-6">
                            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div class="flex items-center">
                                    <Icon icon="heroicons:check-circle" class="w-5 h-5 text-green-600 mr-2" />
                                    <span class="text-sm font-medium text-green-800">{m.writing_paper_completed()}</span>
                                </div>
                                <p class="text-sm text-green-700 mt-1">
                                    {m.writing_review_instruction()}
                                </p>
                            </div>

                            <!-- Download Options -->
                            <DownloadOptions 
                                draftId={draftId}
                                projectTitle={paperTitle}
                                manuscriptTitle={paperTitle}
                                isCompleted={false}
                                content={`# ${paperTitle}\n\n${generatedContent}\n\n${generatedReferences}`}
                            />
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