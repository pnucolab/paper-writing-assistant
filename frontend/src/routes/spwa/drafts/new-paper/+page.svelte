<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import StepProgress from '$lib/components/ui/StepProgress.svelte';

	import type { WorkflowStep, Citation } from '$lib/stores/drafts';
	import type { PageData } from './$types';
	import FormatStep from '$lib/components/drafts/FormatStep.svelte';
	import DocumentStep from '$lib/components/drafts/DocumentStep.svelte';
	import FocusStep from '$lib/components/drafts/FocusStep.svelte';
	import OutlineStep from '$lib/components/drafts/OutlineStep.svelte';
	import WritingStep from '$lib/components/drafts/WritingStep.svelte';

	// Draft interface
	interface Draft {
		id: string;
		projectTitle: string; // Project name (different from manuscript title)
		currentStep: WorkflowStep;
		createdAt: string;
		lastModified: string;
		// Extended workflow data - manuscript title, paperType, targetLength, citations stored in format step
		researchFocus?: string;
		paperOutline?: Array<{title: string; bulletPoints: string[]; citationIndices: number[]}>;
	}

	// Props from load function
	let { data }: { data: PageData } = $props();

	// State
	let currentStep = $state<WorkflowStep>('format');
	let citations = $state<Citation[]>([]);
	let uploadedFiles = $state<{ id: string; name: string; type: string; size: number; url?: string; summary?: string; isProcessing?: boolean }[]>([]);
	let figureFiles = $state<{ id: string; name: string; type: string; size: number; url?: string; thumbnail?: string; summary?: string; isProcessing?: boolean }[]>([]);
	let currentDraft = $state<Draft | null>(null);
	let drafts = $state<Draft[]>([]);
	

	// URL hash management
	function updateUrlHash(step: WorkflowStep) {
		if (browser) {
			window.location.hash = step;
		}
	}

	function getStepFromHash(): WorkflowStep {
		if (!browser) return 'format';
		
		const hash = window.location.hash.slice(1) as WorkflowStep;
		const validSteps: WorkflowStep[] = ['format', 'documents', 'focus', 'outline', 'writing'];
		
		if (validSteps.includes(hash)) {
			return hash;
		}
		return 'format';
	}

	// Step completion tracking
	function isStepCompleted(step: WorkflowStep): boolean {
		if (!currentDraft) return false;
		
		// Check if localStorage data exists for this step
		try {
			const stepData = localStorage.getItem(`paperwriter-draft-${currentDraft.id}-${step}`);
			return stepData !== null && stepData !== '';
		} catch (error) {
			console.error('Failed to check step completion:', error);
			return false;
		}
	}

	// Step validation - users can only access completed steps, current step, or next step
	function validateStepAccess(step: WorkflowStep): WorkflowStep {
		if (!currentDraft) return step;
		
		const stepOrder: WorkflowStep[] = ['format', 'documents', 'focus', 'outline', 'writing'];
		const currentStepIndex = stepOrder.indexOf(currentDraft.currentStep);
		const targetStepIndex = stepOrder.indexOf(step);
		
		// Allow access to completed steps, current step, or the immediate next step
		if (isStepCompleted(step) || 
			step === currentDraft.currentStep || 
			targetStepIndex === currentStepIndex + 1) {
			return step;
		}
		
		// If trying to access a future step beyond the next one, redirect to current step
		return currentDraft.currentStep;
	}

	// Navigation functions
	function goToStep(step: WorkflowStep) {
		const validatedStep = validateStepAccess(step);
		currentStep = validatedStep;
		updateUrlHash(validatedStep);
		
		// Update draft's current step
		if (currentDraft) {
			currentDraft.currentStep = validatedStep;
			currentDraft.lastModified = new Date().toISOString();
			saveDraftToList();
		}
	}

	function nextStep() {
		let nextStepValue: WorkflowStep;
		switch (currentStep) {
			case 'format':
				nextStepValue = 'documents';
				break;
			case 'documents':
				nextStepValue = 'focus';
				break;
			case 'focus':
				nextStepValue = 'outline';
				break;
			case 'outline':
				nextStepValue = 'writing';
				break;
			case 'writing':
				// Already at final step
				return;
		}
		goToStep(nextStepValue);
	}

	function previousStep() {
		let prevStepValue: WorkflowStep;
		switch (currentStep) {
			case 'documents':
				prevStepValue = 'format';
				break;
			case 'focus':
				prevStepValue = 'documents';
				break;
			case 'outline':
				prevStepValue = 'focus';
				break;
			case 'writing':
				prevStepValue = 'outline';
				break;
			case 'format':
				// Already at first step
				return;
		}
		goToStep(prevStepValue);
	}

	// Draft management
	function loadDrafts() {
		try {
			const saved = localStorage.getItem('paperwriter-drafts');
			if (saved) {
				drafts = JSON.parse(saved);
			}
		} catch (error) {
			console.error('Failed to load drafts:', error);
		}
	}

	function saveDraftToList() {
		if (currentDraft) {
			const draftIndex = drafts.findIndex(d => d.id === currentDraft?.id);
			if (draftIndex !== -1) {
				drafts[draftIndex] = currentDraft;
				try {
					localStorage.setItem('paperwriter-drafts', JSON.stringify(drafts));
				} catch (error) {
					console.error('Failed to save draft:', error);
				}
			}
		}
	}

	// Load citations from localStorage for this draft
	function loadDraftCitations(draftId: string) {
		try {
			const saved = localStorage.getItem(`paperwriter-draft-${draftId}-documents`);
			if (saved) {
				const draftData = JSON.parse(saved);
				citations = draftData.citations || [];
			}
		} catch (error) {
			console.error('Failed to load citations:', error);
		}
	}

	// Handle hash changes (back/forward browser navigation)
	function handleHashChange() {
		if (!browser) return;
		const hashStep = getStepFromHash();
		const validatedStep = validateStepAccess(hashStep);
		
		if (validatedStep !== hashStep) {
			// If validation changed the step, update the URL
			updateUrlHash(validatedStep);
		}
		
		currentStep = validatedStep;
		
		// Update draft's current step
		if (currentDraft) {
			currentDraft.currentStep = validatedStep;
			currentDraft.lastModified = new Date().toISOString();
			saveDraftToList();
		}
	}

	// Initialize on mount
	onMount(() => {
		loadDrafts();
		
		// Get draft ID - from load function or extract from URL on client-side
		let draftId = data.draftId;
		if (!draftId && browser) {
			const urlParams = new URLSearchParams(window.location.search);
			draftId = urlParams.get('id');
		}
		
		// Find the current draft
		const draft = drafts.find(d => d.id === draftId);
		if (!draft) {
			// Draft not found, redirect to drafts list
			goto('/spwa/drafts');
			return;
		}
		
		currentDraft = draft;
		loadDraftCitations(draftId!);

		// Set initial step from URL hash or draft's current step
		const hashStep = getStepFromHash();
		const initialStep = hashStep !== 'format' ? hashStep : draft.currentStep;
		const validatedStep = validateStepAccess(initialStep);
		
		if (validatedStep !== hashStep && hashStep !== 'format') {
			// If validation changed the step, update the URL
			updateUrlHash(validatedStep);
		}
		
		currentStep = validatedStep;

		// Listen for hash changes
		if (browser) {
			window.addEventListener('hashchange', handleHashChange);
			
			// Cleanup
			return () => {
				window.removeEventListener('hashchange', handleHashChange);
			};
		}
	});

	// Step definitions with i18n support
	let steps = $derived(() => [
		{ id: 'format' as WorkflowStep, label: m.newpaper_step_format_title(), icon: 'heroicons:document-text' },
		{ id: 'documents' as WorkflowStep, label: m.newpaper_step_documents_title(), icon: 'heroicons:folder-open' },
		{ id: 'focus' as WorkflowStep, label: m.newpaper_step_focus_title(), icon: 'heroicons:light-bulb' },
		{ id: 'outline' as WorkflowStep, label: m.newpaper_step_outline_title(), icon: 'heroicons:list-bullet' },
		{ id: 'writing' as WorkflowStep, label: m.newpaper_step_writing_title(), icon: 'heroicons:pencil-square' }
	]);

	// Step titles and descriptions
	let stepInfo = $derived(() => {
		switch (currentStep as WorkflowStep) {
			case 'format':
				return {
					title: m.newpaper_step_format_title(),
					description: m.newpaper_step_format_description()
				};
			case 'documents':
				return {
					title: m.newpaper_step_documents_title(),
					description: m.newpaper_step_documents_description()
				};
			case 'focus':
				return {
					title: m.newpaper_step_focus_title(),
					description: m.newpaper_step_focus_description()
				};
			case 'outline':
				return {
					title: m.newpaper_step_outline_title(),
					description: m.newpaper_step_outline_description()
				};
			case 'writing':
				return {
					title: m.newpaper_step_writing_title(),
					description: m.newpaper_step_writing_description()
				};
		}
	});
</script>

{#if currentDraft}
	<div class="max-w-7xl mx-auto px-6 py-8">
		<!-- Draft Header -->
		<div class="mb-6">
			<div class="flex items-center space-x-2 text-sm text-secondary-600 mb-2">
				<a href="/spwa/drafts" class="hover:text-primary-600">← {m.drafts_back_to_list()}</a>
				<span>•</span>
				<span>{currentDraft.projectTitle}</span>
			</div>
		</div>

		<!-- Step Progress -->
		<StepProgress 
			{currentStep} 
			steps={steps()}
			onStepClick={goToStep}
			allowNavigation={true}
			isStepCompleted={isStepCompleted}
			class="mb-8" 
		/>

		<!-- Page Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-semibold text-secondary-900 mb-2">{stepInfo().title}</h1>
			<p class="text-secondary-600">{stepInfo().description}</p>
		</div>

		<!-- Step Content -->
		{#if currentStep === 'format'}
			<FormatStep 
				draftId={currentDraft.id}
				onNextStep={nextStep}
			/>
		{:else if currentStep === 'documents'}
			<DocumentStep 
				draftId={currentDraft.id}
				bind:citations={citations}
				bind:uploadedFiles={uploadedFiles}
				bind:figureFiles={figureFiles}
				onNextStep={nextStep}
				onPreviousStep={previousStep}
			/>
		{:else if currentStep === 'focus'}
			<FocusStep 
				draftId={currentDraft.id}
				llmClient={data.llmClient}
				llmConfigError={data.llmConfigError}
				onNextStep={nextStep}
				onPreviousStep={previousStep}
			/>
		{:else if currentStep === 'outline'}
			<OutlineStep 
				draftId={currentDraft.id}
				{currentStep} 
				{citations}
				llmClient={data.llmClient}
				llmConfigError={data.llmConfigError}
				onNextStep={nextStep}
				onPreviousStep={previousStep}
				onGoToStep={goToStep}
			/>
		{:else if currentStep === 'writing'}
			<WritingStep 
				draftId={currentDraft.id}
				{citations}
				llmClient={data.llmClient}
				llmConfigError={data.llmConfigError}
				onPreviousStep={previousStep}
			/>
		{/if}
	</div>
{:else}
	<div class="max-w-7xl mx-auto px-6 py-8">
		<div class="text-center">
			<h1 class="text-2xl font-semibold text-secondary-900 mb-4">Draft not found</h1>
			<p class="text-secondary-600 mb-6">The draft you're looking for doesn't exist.</p>
			<a href="/spwa/drafts" class="text-primary-600 hover:text-primary-700">← Back to drafts</a>
		</div>
	</div>
{/if}