<script lang="ts">
	import Icon from '@iconify/svelte';

	import type { WorkflowStep } from '$lib/stores/drafts.js';

	export interface StepConfig {
		id: WorkflowStep;
		label: string;
		icon: string;
	}

	interface Props {
		currentStep: WorkflowStep;
		steps: StepConfig[];
		onStepClick?: (step: WorkflowStep) => void;
		allowNavigation?: boolean;
		isStepCompleted?: (step: WorkflowStep) => boolean;
		class?: string;
	}

	let { 
		currentStep, 
		steps,
		onStepClick,
		allowNavigation = false,
		isStepCompleted,
		class: className = ''
	}: Props = $props();

	function getStepIndex(stepId: WorkflowStep): number {
		return steps.findIndex(step => step.id === stepId);
	}

	function isStepCompletedInternal(stepId: WorkflowStep): boolean {
		// Use external completion function if provided, otherwise use default logic
		if (isStepCompleted) {
			return isStepCompleted(stepId);
		}
		return getStepIndex(stepId) < getStepIndex(currentStep);
	}

	function isStepCurrent(stepId: WorkflowStep): boolean {
		return stepId === currentStep;
	}

	function isStepClickable(stepId: WorkflowStep): boolean {
		if (!allowNavigation || !onStepClick) return false;
		// Allow clicking on completed steps or current step
		return isStepCompletedInternal(stepId) || isStepCurrent(stepId);
	}

	function handleStepClick(stepId: WorkflowStep) {
		if (isStepClickable(stepId)) {
			onStepClick?.(stepId);
		}
	}
</script>

<div class="flex items-center justify-between {className}">
	{#each steps as step, index}
		<div class="flex items-center {index < steps.length - 1 ? 'flex-1' : ''}">
			<!-- Step Circle -->
			<div class="relative">
				<button
					class="relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 
						{isStepCurrent(step.id)
							? 'bg-primary-600 border-primary-600 text-white'
							: isStepClickable(step.id)
								? 'bg-white border-secondary-300 text-secondary-600 hover:border-primary-400 hover:text-primary-600'
								: 'bg-white border-secondary-300 text-secondary-400'
						}
						{isStepClickable(step.id) ? 'cursor-pointer' : 'cursor-default'}
					"
					onclick={() => handleStepClick(step.id)}
					disabled={!isStepClickable(step.id)}
				>
					<Icon icon={step.icon} class="w-5 h-5" />
				</button>
				
				<!-- Completion Badge -->
				{#if isStepCompletedInternal(step.id)}
					<div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
						<Icon icon="heroicons:check" class="w-2.5 h-2.5 text-white" />
					</div>
				{/if}
			</div>

			<!-- Step Label -->
			<div class="ml-3 min-w-0">
				<p class="text-sm font-medium 
					{isStepCurrent(step.id)
						? 'text-primary-700'
						: isStepClickable(step.id)
							? 'text-secondary-600 hover:text-primary-600 cursor-pointer'
							: 'text-secondary-500'
					}
				"
				onclick={() => handleStepClick(step.id)}
				>
					{step.label}
				</p>
			</div>

			<!-- Connector Line -->
			{#if index < steps.length - 1}
				<div class="flex-1 mx-4">
					<div class="h-0.5 w-full 
						{isStepCompletedInternal(steps[index + 1].id) 
							? 'bg-primary-600' 
							: 'bg-secondary-200'
						}
					"></div>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	button:disabled {
		cursor: default;
	}
</style>