<script lang="ts">
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import Card from '$lib/components/ui/Card.svelte';
	import Heading from '$lib/components/ui/Heading.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import Label from '$lib/components/ui/Label.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '@iconify/svelte';

    // i18n
    import { m } from '$lib/paraglide/messages.js';
    import { getLocale } from '$lib/paraglide/runtime.js';

    import type { WorkflowStep, Citation, CitationContext } from '$lib/stores/drafts';
	import { 
		getTitleGenerationPrompt, 
		getOutlineGenerationPrompt, 
		getKeyPointsAndReferencesGenerationPrompt,
		getTargetLanguageEnforcement,
		getInterfaceLanguageEnforcement
	} from '$lib/utils/prompts';
	import type { LLMClient } from '$lib/utils/llm';

    // Props
    let { 
        draftId,
        currentStep, 
        citations,
        llmClient,
        llmConfigError,
        onNextStep, 
        onPreviousStep, 
        onGoToStep 
    }: { 
        draftId: string;
        currentStep: WorkflowStep; 
        citations: Citation[];
        llmClient: LLMClient | null;
        llmConfigError: string | null;
        onNextStep: () => void;
        onPreviousStep: () => void;
        onGoToStep: (step: WorkflowStep) => void;
    } = $props();

	// State variables
	let generatingTitle = $state(false);
	let referenceSearchQueries = $state<Record<string, string>>({});

	// Paper data
	let paperTitle = $state('');
	let suggestedTitles = $state<string[]>([]);
	let paperType = $state('research');

	// Paper structure data
	interface OutlineSection {
		id: string;
		title: string;
		bulletPoints: string[];
		citationIndices: number[];
		wordCount: number;
	}
	
	let paperOutline = $state<OutlineSection[]>([]);
	let suggestedOutlines = $state<string[][]>([]);
	let generatingOutline = $state(false);
	let generatingKeyPoints = $state<Record<string, boolean>>({});
	let sectionsInQueue = $state<string[]>([]);
	let regeneratingAll = $state(false);
	let anyAIRunning = $derived(() => {
		return generatingTitle || 
			   generatingOutline || 
			   regeneratingAll || 
			   Object.values(generatingKeyPoints).some(Boolean);
	});

	// Common retry configuration for AI operations
	const MAX_RETRIES = 3;
	const RETRY_DELAY_MS = 1000;

	// Common data loaded once in onMount
	let targetLength = $state(5000);
	let targetLanguage = $state('English');
	let citationsContext = $state<Array<{title: string; authors: string; year: number; abstract: string}>>([]);
	let defaultOutlineSections = $state<OutlineSection[]>([]);
	// LLM client is passed as prop from parent
	let researchFocus = $state('');
	
	// File summaries from documents step
	let figureFiles = $state<{ name: string; summary?: string }[]>([]);
	let supplementaryFiles = $state<{ name: string; summary?: string }[]>([]);

	// Initialize default outline based on paper type
	function initializeDefaultOutline(type: string): OutlineSection[] {
		const baseId = () => Math.random().toString(36).substring(2, 11);
		
		if (type === 'perspective' || type === 'reply' || type === 'letter') {
			// Only one section allowed for these types
			return [
				{ id: baseId(), title: m.outline_section_main(), bulletPoints: [], citationIndices: [], wordCount: targetLength },
			];
		} else if (type === 'review') {
			// Review papers have conclusions and future directions
			return [
				{ id: baseId(), title: m.outline_section_abstract(), bulletPoints: [], citationIndices: [], wordCount: Math.round(targetLength * 0.05) },
				{ id: baseId(), title: m.outline_section_introduction(), bulletPoints: [], citationIndices: [], wordCount: Math.round(targetLength * 0.15) },
				{ id: baseId(), title: m.outline_section_main_section_1(), bulletPoints: [], citationIndices: [], wordCount: Math.round(targetLength * 0.25) },
				{ id: baseId(), title: m.outline_section_main_section_2(), bulletPoints: [], citationIndices: [], wordCount: Math.round(targetLength * 0.25) },
				{ id: baseId(), title: m.outline_section_discussion(), bulletPoints: [], citationIndices: [], wordCount: Math.round(targetLength * 0.15) },
				{ id: baseId(), title: m.outline_section_conclusions(), bulletPoints: [], citationIndices: [], wordCount: Math.round(targetLength * 0.08) },
				{ id: baseId(), title: m.outline_section_future_directions(), bulletPoints: [], citationIndices: [], wordCount: Math.round(targetLength * 0.07) }
			];
		} else {
			// Default for research and other types
			return [
				{ id: baseId(), title: m.outline_section_abstract(), bulletPoints: [], citationIndices: [], wordCount: Math.round(targetLength * 0.05) },
				{ id: baseId(), title: m.outline_section_introduction(), bulletPoints: [], citationIndices: [], wordCount: Math.round(targetLength * 0.18) },
				{ id: baseId(), title: m.outline_section_main_section_1(), bulletPoints: [], citationIndices: [], wordCount: Math.round(targetLength * 0.25) },
				{ id: baseId(), title: m.outline_section_main_section_2(), bulletPoints: [], citationIndices: [], wordCount: Math.round(targetLength * 0.22) },
				{ id: baseId(), title: m.outline_section_discussion(), bulletPoints: [], citationIndices: [], wordCount: Math.round(targetLength * 0.18) },
				{ id: baseId(), title: m.outline_section_materials_methods(), bulletPoints: [], citationIndices: [], wordCount: Math.round(targetLength * 0.12) }
			];
		}
	}

	function saveStructurePaper() {
		try {
			const draft = {
				title: paperTitle,
				paperOutline,
				suggestedTitles,
				suggestedOutlines,
				lastSaved: new Date().toISOString()
			};
			localStorage.setItem(`paperwriter-draft-${draftId}-outline`, JSON.stringify(draft));
		} catch (error) {
			console.error('Failed to save structure paper:', error);
		}
	}

	let canProceedToWriting = $derived(() => {
		return paperTitle.trim().length > 0 && paperOutline.length > 0;
	});

	let totalWordCount = $derived(() => {
		return paperOutline.reduce((total, section) => total + (section.wordCount || 0), 0);
	});

	async function generateTitleSuggestions() {
		if (citations.length === 0 || !llmClient || llmConfigError) return;

		generatingTitle = true;
		suggestedTitles = []; // Clear existing suggestions when regenerating
		try {
			// Get base system prompt
			const baseSystemPrompt = getTitleGenerationPrompt(paperType, citationsContext, researchFocus);
			
			// Add target language enforcement for title generation (different from interface language)
			const targetLanguageRequirement = getTargetLanguageEnforcement(targetLanguage);

			const systemPrompt = `${targetLanguageRequirement}${baseSystemPrompt}`;
			
			const userPrompt = targetLanguage !== 'English' 
				? `Generate 5 diverse academic paper titles in ${targetLanguage} based on the provided literature.`
				: 'Generate 5 diverse academic paper titles based on the provided literature.';

			const result = await llmClient.chatCompletion(systemPrompt, userPrompt);
			
			// Parse the generated titles (one per line)
			suggestedTitles = result.content
				.split('\n')
				.map((title: string) => title.trim())
				.filter((title: string) => title.length > 0)
				.slice(0, 5); // Ensure max 5 titles

			if (suggestedTitles.length === 0) {
				throw new Error('No valid titles were generated');
			}

		} catch (error) {
			console.error('Failed to generate title suggestions:', error);
			// Fallback to basic titles if API fails
			suggestedTitles = [
				`A Study on ${citations[0]?.title.split(' ').slice(0, 3).join(' ') || 'Research Topic'}`,
				`Analysis of ${citations[0]?.title.split(' ').slice(1, 4).join(' ') || 'Key Concepts'}`,
				`Investigating ${citations[0]?.title.split(' ').slice(0, 2).join(' ') || 'Research Area'}`,
				`Research on ${citations[0]?.title.split(' ').slice(2, 5).join(' ') || 'Academic Subject'}`,
				`Exploring ${citations[0]?.title.split(' ').slice(0, 3).join(' ') || 'Field of Study'}`
			];
		} finally {
			generatingTitle = false;
		}
	}

	function selectSuggestedTitle(title: string) {
		paperTitle = title;
		saveStructurePaper();
	}

	function proceedToNextStep() {
		saveStructurePaper();
		onNextStep();
	}

	function proceedToPreviousStep() {
		saveStructurePaper();
		onPreviousStep();
	}

	async function generateOutlineSuggestions() {
		if (citations.length === 0 || !llmClient || llmConfigError) return;

		generatingOutline = true;
		
		try {
			// Get the predefined sections for this paper type
			const sectionsContext = defaultOutlineSections.map(section => ({
				title: section.title,
				keyPoints: [],
				citations: []
			}));

			const systemPrompt = getOutlineGenerationPrompt(paperType, targetLength, citationsContext, sectionsContext, researchFocus, targetLanguage);
			const userPrompt = `Generate an appropriate section structure for a ${paperType} paper based on the provided literature.`;

			interface OutlineResponse {
				sections: Array<{
					title: string;
					wordCount: number;
				}>;
			}

			const result = await llmClient.chatCompletion(systemPrompt, userPrompt);
			const parsedResponse: OutlineResponse = JSON.parse(result.content);

			// Validate JSON structure
			if (!parsedResponse.sections || !Array.isArray(parsedResponse.sections)) {
				throw new Error('Invalid JSON structure: missing sections array');
			}

			if (parsedResponse.sections.length === 0) {
				throw new Error('No sections generated');
			}

			// Convert AI response to OutlineSection format
			paperOutline = parsedResponse.sections.map((section: any) => ({
				id: Math.random().toString(36).substring(2, 11),
				title: section.title,
				bulletPoints: [],
				citationIndices: [],
				wordCount: section.wordCount || Math.round(targetLength / parsedResponse.sections.length)
			}));

			// Initialize search queries for all AI-generated sections
			paperOutline.forEach(section => initializeSearchQuery(section.id));
			saveStructurePaper();
			
			// After creating sections, automatically generate key points for each section
			setTimeout(async () => {
				// Add all sections to the queue
				sectionsInQueue = paperOutline.map(section => section.id);
				
				try {
					// Generate key points for each section sequentially
					for (const section of paperOutline) {
						await generateKeyPointsAndReferencesForSection(section.id);
						// Remove from queue after completion
						sectionsInQueue = sectionsInQueue.filter(id => id !== section.id);
					}
				} finally {
					sectionsInQueue = []; // Clear queue on completion or error
				}
			}, 500);

		} catch (error) {
			console.error('Failed to generate outline suggestions:', error);
			alert(m.outline_generation_failed({ retries: MAX_RETRIES }));
		} finally {
			generatingOutline = false;
		}
	}

	function createDefaultOutline() {
		paperOutline = [...defaultOutlineSections];
		// Initialize search queries for all sections
		paperOutline.forEach(section => initializeSearchQuery(section.id));
		saveStructurePaper();
	}


	function addOutlineSection() {
		const newSection: OutlineSection = {
			id: Math.random().toString(36).substring(2, 11),
			title: 'New Section',
			bulletPoints: [],
			citationIndices: [],
			wordCount: 500
		};
		paperOutline = [...paperOutline, newSection];
		initializeSearchQuery(newSection.id);
		saveStructurePaper();
		
		// Scroll to bottom of page after adding section
		setTimeout(() => {
			window.scrollTo({
				top: document.body.scrollHeight,
				behavior: 'smooth'
			});
		}, 250); // Small delay to allow DOM update and animation
	}

	function removeOutlineSection(sectionId: string) {
		paperOutline = paperOutline.filter(section => section.id !== sectionId);
		saveStructurePaper();
	}

	function updateSectionTitle(sectionId: string, title: string) {
		paperOutline = paperOutline.map(section => 
			section.id === sectionId ? { ...section, title } : section
		);
		saveStructurePaper();
	}

	function updateSectionWordCount(sectionId: string, wordCount: number) {
		paperOutline = paperOutline.map(section => 
			section.id === sectionId ? { ...section, wordCount } : section
		);
		saveStructurePaper();
	}

	function addBulletPoint(sectionId: string) {
		paperOutline = paperOutline.map(section => 
			section.id === sectionId 
				? { ...section, bulletPoints: [...section.bulletPoints, ''] }
				: section
		);
		saveStructurePaper();
	}

	function updateBulletPoint(sectionId: string, bulletIndex: number, text: string) {
		paperOutline = paperOutline.map(section => 
			section.id === sectionId 
				? { 
					...section, 
					bulletPoints: section.bulletPoints.map((bullet, i) => i === bulletIndex ? text : bullet)
				}
				: section
		);
		saveStructurePaper();
	}

	function removeBulletPoint(sectionId: string, bulletIndex: number) {
		paperOutline = paperOutline.map(section => 
			section.id === sectionId 
				? { 
					...section, 
					bulletPoints: section.bulletPoints.filter((_, i) => i !== bulletIndex)
				}
				: section
		);
		saveStructurePaper();
	}

	function toggleCitationForSection(sectionId: string, citationIndex: number) {
		paperOutline = paperOutline.map(section => 
			section.id === sectionId 
				? { 
					...section, 
					citationIndices: section.citationIndices.includes(citationIndex)
						? section.citationIndices.filter(index => index !== citationIndex)
						: [...section.citationIndices, citationIndex]
				}
				: section
		);
		saveStructurePaper();
	}

	function moveSectionUp(sectionId: string) {
		const index = paperOutline.findIndex(section => section.id === sectionId);
		if (index > 0) {
			const newOutline = [...paperOutline];
			[newOutline[index - 1], newOutline[index]] = [newOutline[index], newOutline[index - 1]];
			paperOutline = newOutline;
			saveStructurePaper();
		}
	}

	function moveSectionDown(sectionId: string) {
		const index = paperOutline.findIndex(section => section.id === sectionId);
		if (index < paperOutline.length - 1) {
			const newOutline = [...paperOutline];
			[newOutline[index], newOutline[index + 1]] = [newOutline[index + 1], newOutline[index]];
			paperOutline = newOutline;
			saveStructurePaper();
		}
	}

	function initializeSearchQuery(sectionId: string) {
		if (!(sectionId in referenceSearchQueries)) {
			referenceSearchQueries[sectionId] = '';
		}
	}

	function getFilteredCitations(sectionId: string) {
		const searchQuery = referenceSearchQueries[sectionId]?.toLowerCase() || '';
		if (!searchQuery) return citations;
		
		return citations.filter(citation => {
			if (!citation) return false;
			
			// Check title (required field)
			if (citation.title && citation.title.toLowerCase().includes(searchQuery)) {
				return true;
			}
			
			// Check authors array
			if (citation.authors && Array.isArray(citation.authors)) {
				if (citation.authors.some(author => author && author.toLowerCase().includes(searchQuery))) {
					return true;
				}
			}
			
			// Check year
			if (citation.year && citation.year.toString().includes(searchQuery)) {
				return true;
			}
			
			// Check abstract
			if (citation.abstract && citation.abstract.toLowerCase().includes(searchQuery)) {
				return true;
			}
			
			return false;
		});
	}

	async function generateKeyPointsAndReferencesForSection(sectionId: string) {
		if (citations.length === 0 || !llmClient || llmConfigError) return;
		
		const section = paperOutline.find(s => s.id === sectionId);
		if (!section) return;

		// Clear existing key points and references before generating new ones
		paperOutline = paperOutline.map(s => 
			s.id === sectionId 
				? { ...s, bulletPoints: [], citationIndices: [] }
				: s
		);
		saveStructurePaper();

		generatingKeyPoints[sectionId] = true;
		
		try {
			// Use the unified prompt for all sections (including Abstract)
			const allSectionTitles = paperOutline.map(s => s.title);
			const baseSystemPrompt = getKeyPointsAndReferencesGenerationPrompt(section.title, paperType, section.wordCount, citationsContext, allSectionTitles, researchFocus, figureFiles, supplementaryFiles);
			
			// Add strong language enforcement for key points generation (interface language, NOT target language)
			const uiLanguage = getLocale();
			const interfaceLanguageRequirement = getInterfaceLanguageEnforcement(uiLanguage, targetLanguage);
			const systemPrompt = `${interfaceLanguageRequirement}${baseSystemPrompt}`;

			const userPrompt = `Generate key points and suggest relevant citations for the "${section.title}" section of a ${paperType} paper.`;

			interface KeyPointsAndReferencesResponse {
				keyPoints: string[];
				suggestedCitationIndices: number[];
			}

			const result = await llmClient.chatCompletion(systemPrompt, userPrompt);
			const parsedResponse: KeyPointsAndReferencesResponse = JSON.parse(result.content);

			// Validate JSON structure
			if (!parsedResponse.keyPoints || !Array.isArray(parsedResponse.keyPoints)) {
				throw new Error('Invalid JSON structure: missing keyPoints array');
			}

			if (!parsedResponse.suggestedCitationIndices || !Array.isArray(parsedResponse.suggestedCitationIndices)) {
				throw new Error('Invalid JSON structure: missing suggestedCitationIndices array');
			}

			if (parsedResponse.keyPoints.length === 0) {
				throw new Error('No key points generated');
			}

			// Validate that suggested indices are within bounds
			const validCitationIndices = parsedResponse.suggestedCitationIndices.filter((index: number) => 
				typeof index === 'number' && index >= 0 && index < citations.length
			);

			// Add generated key points and citation indices to the section
			paperOutline = paperOutline.map(s => 
				s.id === sectionId 
					? { 
						...s, 
						bulletPoints: [...s.bulletPoints, ...parsedResponse.keyPoints],
						citationIndices: [...new Set([...s.citationIndices, ...validCitationIndices])]
					}
					: s
			);
			saveStructurePaper();

		} catch (error) {
			console.error('Failed to generate key points and references:', error);
			alert(m.outline_keypoints_failed({ retries: MAX_RETRIES }));
		} finally {
			generatingKeyPoints[sectionId] = false;
		}
	}


	async function regenerateAllWithAI() {
		if (citations.length === 0 || paperOutline.length === 0) return;
		
		regeneratingAll = true;
		
		// Add all sections to the queue
		sectionsInQueue = paperOutline.map(section => section.id);
		
		try {
			// Sequentially generate key points and references for each section
			// Abstract will be handled specially (no citations) by the prompt function
			for (const section of paperOutline) {
				await generateKeyPointsAndReferencesForSection(section.id);
				// Remove from queue after completion
				sectionsInQueue = sectionsInQueue.filter(id => id !== section.id);
			}
		} catch (error) {
			console.error('Failed to regenerate all with AI:', error);
		} finally {
			regeneratingAll = false;
			sectionsInQueue = []; // Clear queue on completion or error
		}
	}

    
	function loadStructurePaper() {
		try {
			// Load paper format to get paper type and target language
			const formatSaved = localStorage.getItem(`paperwriter-draft-${draftId}-format`);
			if (formatSaved) {
				const format = JSON.parse(formatSaved);
				paperType = format.paperType || 'research';
				targetLanguage = format.targetLanguage || 'English';
			}

			const saved = localStorage.getItem(`paperwriter-draft-${draftId}-outline`);
			if (saved) {
				const structure = JSON.parse(saved);
				paperTitle = structure.title || '';
				paperOutline = structure.paperOutline || [];
				suggestedTitles = structure.suggestedTitles || [];
				suggestedOutlines = structure.suggestedOutlines || [];
			}
			
			// Don't auto-initialize outline - let user choose manual or AI generation
		} catch (error) {
			console.error('Failed to load structure paper:', error);
			// No fallback - let user choose how to create outline
		}
	}
    
	// Load saved data on mount
	onMount(() => {
		loadStructurePaper();
		
		// Load common data for AI operations
		try {
			const formatSaved = localStorage.getItem(`paperwriter-draft-${draftId}-format`);
			if (formatSaved) {
				const format = JSON.parse(formatSaved);
				targetLength = format.targetLength || 5000;
				targetLanguage = format.targetLanguage || 'English';
			}
		} catch (error) {
			console.error('Failed to load paper format:', error);
		}

		// Load research focus from previous step
		try {
			const focusSaved = localStorage.getItem(`paperwriter-draft-${draftId}-focus`);
			if (focusSaved) {
				const focusData = JSON.parse(focusSaved);
				researchFocus = focusData.researchFocus || '';
			}
		} catch (error) {
			console.error('Failed to load research focus:', error);
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

		// Build citations context once
		citationsContext = citations.map((citation) => ({
			title: citation.title,
			authors: citation.authors.join(', '),
			year: citation.year,
			abstract: citation.abstract || 'No abstract available'
		}));

		// Initialize default outline sections once
		defaultOutlineSections = initializeDefaultOutline(paperType);

		// Initialize search queries for existing sections loaded from localStorage
		paperOutline.forEach(section => initializeSearchQuery(section.id));

		// LLM client is passed as prop from parent
	});
</script>

<!-- Paper Structure & Title Step -->
<div class="space-y-6">
    
    <!-- Title Generation -->
    <Card>
        {#snippet header()}
            <Heading level="h3" size="lg">{m.outline_title_generation_title()}</Heading>
            <p class="text-secondary-600 mt-1">{m.outline_title_generation_subtitle()}</p>
        {/snippet}

        <div class="space-y-6">
            <!-- AI Title Generation Button at Top -->
            <div class="flex justify-between items-center">
                <div class="flex-1">
                    <Heading level="h4" size="md" class="mb-2">{m.outline_ai_title_suggestions()}</Heading>
                    <p class="text-sm text-secondary-600">{m.outline_ai_title_suggestions_desc()}</p>
                </div>
                <Button
                    onclick={generateTitleSuggestions}
                    disabled={anyAIRunning() || citations.length === 0 || !!llmConfigError}
                    variant="primary"
                    iconLeft={generatingTitle ? "heroicons:arrow-path" : "heroicons:sparkles"}
                >
                    {generatingTitle ? m.outline_generating_title() : (suggestedTitles.length > 0 ? m.outline_regenerate_titles() : m.outline_generate_titles())}
                </Button>
            </div>

            {#if llmConfigError}
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <Icon icon="heroicons:exclamation-triangle" class="w-5 h-5 text-red-600 mr-2" />
                        <div>
                            <p class="text-sm font-medium text-red-800">Configuration Required</p>
                            <p class="text-sm text-red-700 mt-1">{llmConfigError}</p>
                        </div>
                    </div>
                </div>
            {:else if citations.length === 0}
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <Icon icon="heroicons:exclamation-triangle" class="w-5 h-5 text-amber-600 mr-2" />
                        <span class="text-sm font-medium text-amber-800">{m.outline_no_citations_title()}</span>
                    </div>
                    <p class="text-sm text-amber-700 mt-1">
                        {m.outline_no_citations_desc()}
                    </p>
                </div>
            {/if}

            {#if generatingTitle}
                <div class="text-center py-6">
                    <Icon icon="heroicons:arrow-path" class="w-8 h-8 mx-auto mb-4 text-primary-600 animate-spin" />
                    <p class="text-secondary-600">{m.outline_analyzing_citations()}</p>
                </div>
            {/if}

            {#if suggestedTitles.length > 0}
                <div>
                    <Heading level="h4" size="md" class="mb-4">{m.outline_suggested_titles()}</Heading>
                    <div class="space-y-3">
                        {#each suggestedTitles as title}
                            <button
                                onclick={() => selectSuggestedTitle(title)}
                                class="w-full p-4 text-left border rounded-lg hover:border-primary-300 transition-colors"
                                class:border-primary-500={paperTitle === title}
                                class:bg-primary-50={paperTitle === title}
                                class:border-secondary-200={paperTitle !== title}
                            >
                                <p class="font-medium text-secondary-900">{title}</p>
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}

            <hr class="border-secondary-200" />

            <!-- Custom Title Section -->
            <div>
                <Heading level="h4" size="md" class="mb-4">{m.outline_custom_title()}</Heading>
                <div class="space-y-3">
                    <Input
                        bind:value={paperTitle}
                        label={m.outline_enter_title()}
                        placeholder={m.outline_title_placeholder()}
                        oninput={() => saveStructurePaper()}
                    />
                    {#if paperTitle && (suggestedTitles.length === 0 || !suggestedTitles.includes(paperTitle))}
                        <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div class="flex items-center">
                                <Icon icon="heroicons:check-circle" class="w-5 h-5 text-green-600 mr-2" />
                                <span class="text-sm font-medium text-green-800">{m.outline_custom_title_set()}</span>
                            </div>
                            <p class="text-sm text-green-700 mt-1">{m.outline_custom_title_message({ title: paperTitle })}</p>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </Card>

    <!-- Paper Outline -->
    <Card>
        {#snippet header()}
            <div class="flex items-center justify-between">
                <div>
                    <Heading level="h3" size="lg">{m.outline_paper_outline_title()}</Heading>
                    <p class="text-secondary-600 mt-1">{m.outline_step_subtitle({ paperType })}</p>
                </div>
                <div class="flex items-center space-x-2">
                    {#if paperOutline.length > 0}
                        <Button
                            onclick={() => {
                                if (confirm(m.outline_clear_confirm())) {
                                    paperOutline = [];
                                    saveStructurePaper();
                                }
                            }}
                            variant="danger"
                            size="sm"
                            iconLeft="heroicons:trash"
                        >
                            {m.outline_clear_all_sections()}
                        </Button>
                        <Button
                            onclick={addOutlineSection}
                            variant="secondary"
                            size="sm"
                            iconLeft="heroicons:plus"
                        >
                            {m.outline_add_section()}
                        </Button>
                    {/if}
                </div>
            </div>
        {/snippet}

        <div class="space-y-6">
            {#if paperOutline.length === 0 && !anyAIRunning()}
                <!-- Initial Creation Options -->
                <div class="text-center py-12 space-y-6">
                    <div>
                        <Icon icon="heroicons:document-text" class="w-16 h-16 mx-auto mb-4 text-secondary-400" />
                        <Heading level="h4" size="lg" class="mb-2">{m.outline_create_outline_title()}</Heading>
                        <p class="text-secondary-600 max-w-md mx-auto">
                            {m.outline_create_outline_desc()}
                        </p>
                    </div>
                    
                    <div class="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                        <Button
                            onclick={generateOutlineSuggestions}
                            disabled={anyAIRunning() || citations.length === 0 || !!llmConfigError}
                            variant="primary"
                            iconLeft="heroicons:sparkles"
                            class="flex-1"
                        >
                            {generatingOutline ? m.outline_generating_ai() : m.outline_generate_ai()}
                        </Button>
                        <Button
                            onclick={createDefaultOutline}
                            variant="secondary"
                            iconLeft="heroicons:plus"
                            class="flex-1"
                        >
                            {m.outline_manual_creation()}
                        </Button>
                    </div>
                    
                    {#if citations.length === 0}
                        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
                            <div class="flex items-center">
                                <Icon icon="heroicons:exclamation-triangle" class="w-5 h-5 text-amber-600 mr-2" />
                                <span class="text-sm font-medium text-amber-800">{m.outline_ai_requires_citations()}</span>
                            </div>
                            <p class="text-sm text-amber-700 mt-1">
                                {m.outline_ai_requires_citations_desc()}
                            </p>
                        </div>
                    {/if}
                </div>
            {:else}
                {#if generatingOutline}
                    <div class="text-center py-6">
                        <Icon icon="heroicons:arrow-path" class="w-8 h-8 mx-auto mb-4 text-primary-600 animate-spin" />
                        <p class="text-secondary-600">{m.outline_generating_structure()}</p>
                    </div>
                {/if}

                <!-- Existing Sections -->
                <div class="flex items-center justify-between mb-4">
                    <div class="text-sm text-secondary-600">
                        <p>{m.outline_sections_defined({ count: paperOutline.length })}</p>
                        <p class="mt-1">{m.outline_total_words({ total: totalWordCount() })}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <Button
                            onclick={regenerateAllWithAI}
                            disabled={anyAIRunning() || citations.length === 0 || !!llmConfigError}
                            variant="primary"
                            size="sm"
                            iconLeft={regeneratingAll ? "heroicons:arrow-path" : "heroicons:sparkles"}
                        >
                            {regeneratingAll ? m.outline_working() : m.outline_regenerate_all()}
                        </Button>
                    </div>
                </div>
            {/if}
            
            {#each paperOutline as section, sectionIndex (section.id)}
                <div class="border border-secondary-200 rounded-lg p-4" animate:flip={{ duration: 200 }}>
                    <!-- Section Header -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center space-x-3 flex-1">
                            <div class="flex-1">
                                <Input
                                    bind:value={section.title}
                                    placeholder={m.outline_section_title_placeholder()}
                                    class="font-medium"
                                    disabled={generatingKeyPoints[section.id] || sectionsInQueue.includes(section.id)}
                                    oninput={() => updateSectionTitle(section.id, section.title)}
                                />
                            </div>
                            <div class="flex items-center space-x-2">
                                <Label for="wordcount-{section.id}" class="text-sm text-secondary-600 whitespace-nowrap">{m.outline_word_count_label()}:</Label>
                                <Input
                                    id="wordcount-{section.id}"
                                    type="number"
                                    bind:value={section.wordCount}
                                    class="w-20 text-center"
                                    min={50}
                                    max={5000}
                                    disabled={generatingKeyPoints[section.id] || sectionsInQueue.includes(section.id)}
                                    oninput={() => updateSectionWordCount(section.id, section.wordCount)}
                                />
                            </div>
                        </div>
                        <div class="flex items-center space-x-1">
                            <!-- Move Up Button -->
                            <button
                                onclick={() => moveSectionUp(section.id)}
                                disabled={sectionIndex === 0 || anyAIRunning()}
                                class="p-2 text-secondary-600 hover:text-secondary-700 hover:bg-secondary-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={m.outline_move_up()}
                            >
                                <Icon icon="heroicons:chevron-up" class="w-4 h-4" />
                            </button>
                            <!-- Move Down Button -->
                            <button
                                onclick={() => moveSectionDown(section.id)}
                                disabled={sectionIndex === paperOutline.length - 1 || anyAIRunning()}
                                class="p-2 text-secondary-600 hover:text-secondary-700 hover:bg-secondary-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={m.outline_move_down()}
                            >
                                <Icon icon="heroicons:chevron-down" class="w-4 h-4" />
                            </button>
                            <!-- Remove Button -->
                            <button
                                onclick={() => removeOutlineSection(section.id)}
                                disabled={anyAIRunning()}
                                class="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={m.outline_remove_section()}
                            >
                                <Icon icon="heroicons:trash" class="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {#if generatingKeyPoints[section.id]}
                        <!-- AI Generation Spinner -->
                        <div class="text-center py-12">
                            <Icon icon="heroicons:arrow-path" class="w-8 h-8 mx-auto mb-4 text-primary-600 animate-spin" />
                            <p class="text-secondary-600 font-medium">{m.outline_generating_title()}</p>
                            <p class="text-sm text-secondary-500 mt-1">
                                {m.outline_ai_generating_content()}
                            </p>
                        </div>
                    {:else if sectionsInQueue.includes(section.id)}
                        <!-- Queued for Generation Spinner -->
                        <div class="text-center py-12">
                            <Icon icon="heroicons:clock" class="w-8 h-8 mx-auto mb-4 text-secondary-400" />
                            <p class="text-secondary-600 font-medium">{m.outline_queued_for_generation()}</p>
                            <p class="text-sm text-secondary-500 mt-1">
                                {m.outline_waiting_for_ai()}
                            </p>
                        </div>
                    {:else}
                        <!-- Bullet Points -->
                        <div class="mb-4">
                            <div class="flex items-center justify-between mb-2">
                                <Label for="">{m.outline_key_points()}</Label>
                                <div class="flex items-center space-x-2">
                                    <Button
                                        onclick={() => addBulletPoint(section.id)}
                                        variant="secondary"
                                        size="sm"
                                        iconLeft="heroicons:plus"
                                    >
                                        {m.outline_add_point()}
                                    </Button>
                                    <Button
                                        onclick={() => generateKeyPointsAndReferencesForSection(section.id)}
                                        disabled={anyAIRunning() || citations.length === 0 || !!llmConfigError}
                                        variant="secondary"
                                        size="sm"
                                        iconLeft="heroicons:sparkles"
                                    >
                                        {m.outline_ai_suggest()}
                                    </Button>
                                </div>
                            </div>
                            <div class="space-y-2">
                                {#each section.bulletPoints as _, bulletIndex}
                                    <div class="flex items-start space-x-2">
                                        <span class="text-secondary-500 mt-2 flex-shrink-0">•</span>
                                        <TextArea
                                            value={section.bulletPoints[bulletIndex]}
                                            placeholder={m.outline_point_placeholder()}
                                            rows={3}
                                            oninput={(e) => updateBulletPoint(section.id, bulletIndex, (e.target as HTMLTextAreaElement).value)}
                                        />
                                        <button
                                            onclick={() => removeBulletPoint(section.id, bulletIndex)}
                                            class="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors mt-1 flex-shrink-0"
                                            title={m.outline_remove_point()}
                                        >
                                            <Icon icon="heroicons:x-mark" class="w-4 h-4" />
                                        </button>
                                    </div>
                                {/each}
                                {#if section.bulletPoints.length === 0}
                                    <p class="text-sm text-secondary-500 italic">{m.outline_no_points()}</p>
                                {/if}
                            </div>
                        </div>

                        <!-- Citations for Section (not for Abstract) -->
                        {#if section.title !== 'Abstract'}
                            {#if citations.length > 0}
                                <div>
                                    <div class="mb-3">
                                        <Label for="">{m.outline_associated_references()}</Label>
                                        <p class="text-xs text-secondary-500 mt-1">
                                            {m.outline_references_auto_suggest()}
                                        </p>
                                    </div>
                                    
                                    <!-- Search Input -->
                                    <div class="mb-3 relative">
                                        <div class="absolute left-3 top-1/2 transform -translate-y-1/2">
                                            <Icon icon="heroicons:magnifying-glass" class="w-4 h-4 text-secondary-400" />
                                        </div>
                                        <Input
                                            bind:value={referenceSearchQueries[section.id]}
                                            placeholder="Search references by title, author, year, or abstract..."
                                            class="text-sm"
                                        />
                                    </div>
									
                                    <div class="max-h-40 overflow-y-auto border border-secondary-200 rounded p-3">
                                        <div class="space-y-2">
                                            {#each getFilteredCitations(section.id) as citation, filteredIndex}
                                                {@const citationIndex = citations.findIndex(c => c.id === citation.id)}
                                                <label class="flex items-start space-x-2 cursor-pointer p-2 rounded transition-colors {section.citationIndices.includes(citationIndex) ? 'bg-primary-100 border border-primary-200' : 'hover:bg-secondary-50'}">
                                                    <input
                                                        type="checkbox"
                                                        checked={section.citationIndices.includes(citationIndex)}
                                                        onchange={() => toggleCitationForSection(section.id, citationIndex)}
                                                        class="mt-1"
                                                    />
                                                    <div class="text-sm">
                                                        <p class="font-medium {section.citationIndices.includes(citationIndex) ? 'text-primary-900' : 'text-secondary-900'}">{citation.title}</p>
                                                        <p class="{section.citationIndices.includes(citationIndex) ? 'text-primary-700' : 'text-secondary-600'}">{citation.authors.join(', ')} ({citation.year})</p>
                                                    </div>
                                                </label>
                                            {:else}
                                                <p class="text-sm text-secondary-500 italic text-center py-4">No references match your search</p>
                                            {/each}
                                        </div>
                                    </div>
                                    <p class="text-xs text-secondary-500 mt-1">
                                        {#if referenceSearchQueries[section.id]}
                                            Showing {getFilteredCitations(section.id).length} of {citations.length} references • {section.citationIndices.length} selected
                                        {:else}
                                            {m.outline_references_selected({ selected: section.citationIndices.length, total: citations.length })}
                                        {/if}
                                    </p>
                                </div>
                            {:else}
                                <div class="text-sm text-secondary-500 bg-secondary-50 p-3 rounded">
                                    {m.outline_no_citations_section()}
                                </div>
                            {/if}
                        {/if}
                    {/if}
                </div>
            {/each}
        </div>
    </Card>



    <!-- Navigation -->
    <div class="flex justify-between">
        <Button
            onclick={proceedToPreviousStep}
            variant="secondary"
            iconLeft="heroicons:arrow-left"
        >
            {m.outline_back_previous()}
        </Button>
        <Button
            onclick={proceedToNextStep}
            disabled={!canProceedToWriting}
            variant="primary"
            iconRight="heroicons:arrow-right"
        >
            {m.outline_start_writing()}
        </Button>
    </div>
</div>
