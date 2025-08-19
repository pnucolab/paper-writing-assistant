<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import * as m from '$lib/paraglide/messages.js';
	import StepProgress from '$lib/components/StepProgress.svelte';

	import type { WorkflowStep, Citation } from './common';
	import FormatStep from './FormatStep.svelte';
	import DocumentStep from './DocumentStep.svelte';
	import FocusStep from './FocusStep.svelte';
	import OutlineStep from './OutlineStep.svelte';
	import WritingStep from './WritingStep.svelte';

	let currentStep = $state<WorkflowStep>('format');
	let citations = $state<Citation[]>([]);

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

	// Citation validation
	function validateStepAccess(step: WorkflowStep): WorkflowStep {
		// If trying to access outline or writing without citations, redirect to documents
		if ((step === 'outline' || step === 'writing') && citations.length === 0) {
			return 'documents';
		}
		return step;
	}

	// Navigation functions
	function goToStep(step: WorkflowStep) {
		const validatedStep = validateStepAccess(step);
		currentStep = validatedStep;
		updateUrlHash(validatedStep);
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

	// Load citations from localStorage
	function loadSavedCitations() {
		try {
			const saved = localStorage.getItem('paperwriter-documents');
			if (saved) {
				const brainstormingData = JSON.parse(saved);
				citations = brainstormingData.citations || [];
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
	}

	// Initialize on mount
	onMount(() => {
		loadSavedCitations();

		// Set initial step from URL hash with validation
		const hashStep = getStepFromHash();
		const validatedStep = validateStepAccess(hashStep);
		
		if (validatedStep !== hashStep) {
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

<div class="max-w-7xl mx-auto px-6 py-8">
	<!-- Step Progress -->
	<StepProgress 
		{currentStep} 
		steps={steps()}
		onStepClick={goToStep}
		allowNavigation={true}
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
			onNextStep={nextStep}
		/>
	{:else if currentStep === 'documents'}
		<DocumentStep 
			bind:citations={citations}
			onNextStep={nextStep}
			onPreviousStep={previousStep}
		/>
	{:else if currentStep === 'focus'}
		<FocusStep 
			{citations}
			onNextStep={nextStep}
			onPreviousStep={previousStep}
		/>
	{:else if currentStep === 'outline'}
		<OutlineStep 
			{currentStep} 
			{citations} 
			onNextStep={nextStep}
			onPreviousStep={previousStep}
			onGoToStep={goToStep}
		/>
	{:else if currentStep === 'writing'}
		<WritingStep 
			{citations}
			onPreviousStep={previousStep}
		/>
	{/if}
</div>