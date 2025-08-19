<script lang="ts">
	import Icon from '@iconify/svelte';

	type WorkflowStep = 'format' | 'documents' | 'focus' | 'outline' | 'writing';

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
		class?: string;
	}

	let { 
		currentStep, 
		steps,
		onStepClick,
		allowNavigation = false,
		class: className = ''
	}: Props = $props();

	function getStepIndex(stepId: WorkflowStep): number {
		return steps.findIndex(step => step.id === stepId);
	}

	function isStepCompleted(stepId: WorkflowStep): boolean {
		return getStepIndex(stepId) < getStepIndex(currentStep);
	}

	function isStepCurrent(stepId: WorkflowStep): boolean {
		return stepId === currentStep;
	}

	function isStepClickable(stepId: WorkflowStep): boolean {
		if (!allowNavigation || !onStepClick) return false;
		// Allow clicking on completed steps or current step
		return isStepCompleted(stepId) || isStepCurrent(stepId);
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
			<button
				class="relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 
					{isStepCompleted(step.id) 
						? 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700' 
						: isStepCurrent(step.id)
							? 'bg-primary-100 border-primary-600 text-primary-700'
							: 'bg-white border-secondary-300 text-secondary-400'
					}
					{isStepClickable(step.id) ? 'cursor-pointer' : 'cursor-default'}
				"
				onclick={() => handleStepClick(step.id)}
				disabled={!isStepClickable(step.id)}
			>
				{#if isStepCompleted(step.id)}
					<Icon icon="heroicons:check" class="w-5 h-5" />
				{:else}
					<Icon icon={step.icon} class="w-5 h-5" />
				{/if}
			</button>

			<!-- Step Label -->
			<div class="ml-3 min-w-0">
				<p class="text-sm font-medium 
					{isStepCompleted(step.id) 
						? 'text-primary-600' 
						: isStepCurrent(step.id)
							? 'text-primary-700'
							: 'text-secondary-500'
					}
				">
					{step.label}
				</p>
			</div>

			<!-- Connector Line -->
			{#if index < steps.length - 1}
				<div class="flex-1 mx-4">
					<div class="h-0.5 w-full 
						{isStepCompleted(steps[index + 1].id) 
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