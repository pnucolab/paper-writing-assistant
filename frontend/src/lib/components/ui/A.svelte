<script lang="ts">
	import Icon from '@iconify/svelte';
	
	type LinkVariant = 'primary' | 'secondary' | 'muted' | 'danger';
	type LinkSize = 'sm' | 'md' | 'lg';

	interface Props {
		href: string;
		variant?: LinkVariant;
		size?: LinkSize;
		external?: boolean;
		underline?: boolean;
		disabled?: boolean;
		class?: string;
		iconLeft?: string;
		iconRight?: string;
		title?: string;
		target?: string;
		rel?: string;
		children?: any;
	}

	let {
		href,
		variant = 'primary',
		size = 'md',
		external = false,
		underline = true,
		disabled = false,
		class: className = '',
		iconLeft,
		iconRight,
		title,
		target,
		rel,
		children
	}: Props = $props();

	// Auto-detect external links
	$effect(() => {
		if (href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//'))) {
			external = true;
		}
	});

	function getLinkClasses() {
		const baseClasses = [
			'inline-flex items-center gap-1',
			'transition-colors duration-200',
			'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 rounded-sm'
		];
		
		// Size classes
		let sizeClasses = '';
		switch (size) {
			case 'sm':
				sizeClasses = 'text-sm';
				break;
			case 'lg':
				sizeClasses = 'text-base';
				break;
			default:
				sizeClasses = 'text-sm';
		}

		// Variant classes
		let variantClasses = '';
		switch (variant) {
			case 'primary':
				variantClasses = 'text-primary-600 hover:text-primary-800';
				break;
			case 'secondary':
				variantClasses = 'text-secondary-600 hover:text-secondary-800';
				break;
			case 'muted':
				variantClasses = 'text-secondary-500 hover:text-secondary-700';
				break;
			case 'danger':
				variantClasses = 'text-red-600 hover:text-red-800';
				break;
		}

		// Underline classes
		const underlineClasses = underline ? 'underline' : '';

		// Disabled classes
		const disabledClasses = disabled 
			? 'opacity-50 cursor-not-allowed pointer-events-none' 
			: '';

		return [...baseClasses, sizeClasses, variantClasses, underlineClasses, disabledClasses, className].join(' ');
	}

	function getIconSize() {
		switch (size) {
			case 'sm': return 'w-3 h-3';
			case 'lg': return 'w-5 h-5';
			default: return 'w-4 h-4';
		}
	}

	function getFinalTarget() {
		if (target) return target;
		return external ? '_blank' : undefined;
	}

	function getFinalRel() {
		if (rel) return rel;
		return external ? 'noopener noreferrer' : undefined;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<a
	{href}
	{title}
	target={getFinalTarget()}
	rel={getFinalRel()}
	class={getLinkClasses()}
	aria-disabled={disabled}
>
	{#if iconLeft}
		<Icon icon={iconLeft} class={getIconSize()} />
	{/if}
	
	{@render children?.()}
	
	{#if iconRight}
		<Icon icon={iconRight} class={getIconSize()} />
	{/if}
	
	{#if external && !iconRight}
		<Icon icon="heroicons:arrow-top-right-on-square" class={getIconSize()} />
	{/if}
</a>