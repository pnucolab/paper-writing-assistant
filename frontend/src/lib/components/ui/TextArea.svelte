<script lang="ts">
	type TextAreaSize = 'sm' | 'md' | 'lg';

	interface Props {
		id?: string;
		value?: string;
		placeholder?: string;
		helpText?: string;
		errorMessage?: string;
		disabled?: boolean;
		required?: boolean;
		size?: TextAreaSize;
		class?: string;
		rows?: number;
		cols?: number;
		maxlength?: number;
		readonly?: boolean;
		resize?: 'none' | 'both' | 'horizontal' | 'vertical';
		onkeyup?: (event: KeyboardEvent) => void;
		oninput?: (event: Event) => void;
	}

	let {
		id = '',
		value = $bindable(''),
		placeholder = '',
		helpText,
		errorMessage,
		disabled = false,
		required = false,
		size = 'md',
		class: className = '',
		rows = 4,
		cols,
		maxlength,
		readonly = false,
		resize = 'vertical',
		onkeyup,
		oninput
	}: Props = $props();

	function getTextAreaClasses() {
		const baseClasses = [
			'block w-full',
			'bg-white',                    // Surface color from style guide
			'border border-secondary-300', // Border from style guide
			'rounded-lg',                  // 8px radius from style guide
			'text-secondary-900',          // Primary text color
			'placeholder-secondary-500',   // Placeholder color
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
		
		// Resize classes
		const resizeClasses = resize === 'none' ? 'resize-none' : 
		                     resize === 'both' ? 'resize' :
		                     resize === 'horizontal' ? 'resize-x' : 'resize-y';
		
		return [...baseClasses, sizeClasses, errorClasses, resizeClasses, className].join(' ');
	}

	function getHelpTextClasses() {
		return errorMessage 
			? 'mt-2 text-sm text-red-600'      // Error color
			: 'mt-2 text-sm text-secondary-600';    // Secondary text from style guide
	}
</script>

<textarea
	{id}
	bind:value
	{placeholder}
	{disabled}
	{required}
	{rows}
	{cols}
	{maxlength}
	{readonly}
	{onkeyup}
	{oninput}
	class={getTextAreaClasses()}
></textarea>

<!-- Help text or error message -->
{#if helpText || errorMessage}
	<div class={getHelpTextClasses()}>
		{errorMessage || helpText}
	</div>
{/if}