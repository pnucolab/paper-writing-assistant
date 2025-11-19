<script lang="ts">
	type InputSize = 'sm' | 'md' | 'lg';
	type InputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'url' | 'tel' | 'date';

	interface Props {
		id?: string;
		value?: string | number;
		type?: InputType;
		placeholder?: string;
		helpText?: string;
		errorMessage?: string;
		disabled?: boolean;
		required?: boolean;
		size?: InputSize;
		class?: string;
		min?: number;
		max?: number;
		step?: number;
		right?: import('svelte').Snippet;
		onkeyup?: (event: KeyboardEvent) => void;
		oninput?: (event: Event) => void;
	}

	let {
		id,
		value = $bindable(''),
		type = 'text',
		placeholder = '',
		helpText,
		errorMessage,
		disabled = false,
		required = false,
		size = 'md',
		class: className = '',
		min,
		max,
		step,
		right,
		onkeyup,
		oninput
	}: Props = $props();

	let inputId = id;

	function getInputClasses() {
		const baseClasses = [
			'block w-full',
			'bg-white',                    // Surface color from style guide
			'border border-secondary-300',      // Border from style guide
			'rounded-lg',                  // 8px radius from style guide
			'text-secondary-900',              // Primary text color
			'placeholder-secondary-500',        // Placeholder color
			'transition-colors',
			'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
			'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-secondary-50'
		];
		
		let sizeClasses = '';
		switch (size) {
			case 'sm':
				sizeClasses = 'px-3 py-2 text-sm';
				break;
			case 'lg':
				sizeClasses = 'px-4 py-4 text-base';
				break;
			default:
				sizeClasses = 'px-3 py-2 text-sm';  // 14px body text from style guide
		}
		
		// Error state styling
		const errorClasses = errorMessage 
			? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
			: '';
		
		// Add right padding if there's a right snippet
		const rightPadding = right ? 'pr-10' : '';
		
		return [...baseClasses, sizeClasses, errorClasses, rightPadding, className].join(' ');
	}


	function getHelpTextClasses() {
		return errorMessage
			? 'text-sm text-red-600'      // Error color
			: 'text-sm text-secondary-600';    // Secondary text from style guide
	}
</script>

<input
	id={inputId}
	{type}
	bind:value
	{placeholder}
	{disabled}
	{required}
	{min}
	{max}
	{step}
	{onkeyup}
	{oninput}
	class={getInputClasses()}
/>

<!-- Right snippet for icons, buttons, etc. -->
{#if right}
	<div class="absolute right-3 top-1/2 transform -translate-y-1/2">
		{@render right()}
	</div>
{/if}

<!-- Help text or error message -->
{#if helpText || errorMessage}
	<div class="mt-1 {getHelpTextClasses()}">
		{#if errorMessage}
			{errorMessage}
		{:else}
			{@html helpText}
		{/if}
	</div>
{/if}