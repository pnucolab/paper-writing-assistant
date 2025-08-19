<script lang="ts">
	import Icon from '@iconify/svelte';
	
	type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type ButtonSize = 'sm' | 'md' | 'lg';

	interface Props {
		variant?: ButtonVariant;
		size?: ButtonSize;
		href?: string;
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		onclick?: () => void;
		class?: string;
		iconLeft?: string;
		iconRight?: string;
		children?: any;
	}

	let {
		variant = 'primary',
		size = 'md',
		href,
		disabled = false,
		type = 'button',
		onclick,
		class: className = '',
		iconLeft,
		iconRight,
		children
	}: Props = $props();

	function getButtonClasses() {
		// Base classes with Tailwind utilities
		const baseClasses = [
			'inline-flex items-center justify-center',
			'font-medium rounded-lg',
			'border transition-all duration-200',
			'focus:outline-none focus:ring-2 focus:ring-offset-2',
			'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
			'select-none'
		];
		
		// Size classes
		let sizeClasses = '';
		switch (size) {
			case 'sm':
				sizeClasses = 'px-3 py-1.5 text-sm gap-1.5';
				break;
			case 'lg':
				sizeClasses = 'px-6 py-3 text-base gap-2';
				break;
			default:
				sizeClasses = 'px-4 py-2 text-sm gap-2';
		}

		// Variant classes
		let variantClasses = '';
		switch (variant) {
			case 'primary':
				variantClasses = 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700 focus:ring-primary-500';
				break;
			case 'secondary':
				variantClasses = 'bg-white text-secondary-900 border-secondary-300 hover:bg-secondary-50 focus:ring-secondary-500';
				break;
			case 'ghost':
				variantClasses = 'bg-transparent text-secondary-600 border-transparent hover:bg-secondary-100 focus:ring-secondary-500';
				break;
			case 'danger':
				variantClasses = 'bg-red-600 text-white border-red-600 hover:bg-red-700 focus:ring-red-500';
				break;
		}

		return [...baseClasses, sizeClasses, variantClasses, className].join(' ');
	}

	function getIconSize() {
		switch (size) {
			case 'sm': return 'w-4 h-4';
			case 'lg': return 'w-5 h-5';
			default: return 'w-4 h-4';
		}
	}
</script>

{#if href}
	<a
		{href}
		class={getButtonClasses()}
		role="button"
		tabindex={disabled ? -1 : 0}
		aria-disabled={disabled}
	>
		{#if iconLeft}
			<Icon icon={iconLeft} class={getIconSize()} />
		{/if}
		{@render children?.()}
		{#if iconRight}
			<Icon icon={iconRight} class={getIconSize()} />
		{/if}
	</a>
{:else}
	<button
		{type}
		{disabled}
		{onclick}
		class={getButtonClasses()}
	>
		{#if iconLeft}
			<Icon icon={iconLeft} class={getIconSize()} />
		{/if}
		{@render children?.()}
		{#if iconRight}
			<Icon icon={iconRight} class={getIconSize()} />
		{/if}
	</button>
{/if}