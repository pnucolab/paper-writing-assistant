<script lang="ts">
	type CardVariant = 'default' | 'elevated' | 'outline';
	type CardSize = 'sm' | 'md' | 'lg';

	interface Props {
		title?: string;
		description?: string;
		variant?: CardVariant;
		size?: CardSize;
		class?: string;
		onclick?: () => void;
		children?: import('svelte').Snippet;
		header?: import('svelte').Snippet;
		headerActions?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
	}

	let {
		title,
		description,
		variant = 'default',
		size = 'md',
		class: className = '',
		onclick,
		children,
		header,
		headerActions,
		footer
	}: Props = $props();

	function getCardClasses() {
		// Base classes following style guide
		const baseClasses = [
			'bg-white',           // Surface color: #FFFFFF
			'rounded-lg',         // 8px radius from style guide
			'transition-all',
			'duration-200'
		];
		
		// Variant classes
		let variantClasses = '';
		switch (variant) {
			case 'elevated':
				// Subtle elevation (0 1px 2px rgba(0,0,0,0.04)) from style guide
				variantClasses = 'shadow-sm border border-secondary-100';
				break;
			case 'outline':
				// Border from style guide: 1px solid #E8E9E7
				variantClasses = 'border border-secondary-200';
				break;
			default:
				// Default with subtle border as per style guide
				variantClasses = 'border border-secondary-200';
		}

		// Interactive states
		const interactiveClasses = onclick ? 'cursor-pointer hover:shadow-sm hover:border-secondary-300' : '';
		
		return [...baseClasses, variantClasses, interactiveClasses, className].join(' ');
	}

	function getContentClasses() {
		// Spacing tokens: 4 / 8 / 12 / 16 / 24 / 32 from style guide
		switch (size) {
			case 'sm': 
				return 'p-4';     // 16px
			case 'lg': 
				return 'p-8';     // 32px
			default: 
				return 'p-6';     // 24px
		}
	}

	function getHeaderClasses() {
		switch (size) {
			case 'sm': 
				return 'px-4 pt-4 pb-4';
			case 'lg': 
				return 'px-8 pt-8 pb-6';
			default: 
				return 'px-6 pt-6 pb-4';
		}
	}

	function getFooterClasses() {
		switch (size) {
			case 'sm': 
				return 'px-4 pb-4 pt-4';
			case 'lg': 
				return 'px-8 pb-8 pt-6';
			default: 
				return 'px-6 pb-6 pt-4';
		}
	}

	function getTitleClasses() {
		// Typography from style guide
		const baseClasses = [
			'font-semibold',
			'text-secondary-900'      // Primary text: #3A393A (closest Tailwind equivalent)
		];

		let sizeClasses = '';
		switch (size) {
			case 'sm': 
				sizeClasses = 'text-base';    // 16px
				break;
			case 'lg': 
				sizeClasses = 'text-xl';      // 20px
				break;
			default: 
				sizeClasses = 'text-lg';      // 18px - Section titles from style guide
		}
		
		return [...baseClasses, sizeClasses].join(' ');
	}

	function getDescriptionClasses() {
		return [
			'mt-1',              // 4px spacing
			'text-sm',           // 14px - Body text from style guide
			'text-secondary-600'      // Secondary text: #87858B (closest Tailwind equivalent)
		].join(' ');
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class={getCardClasses()}
	{onclick}
>
	<!-- Header -->
	{#if title || header}
		<div class="{getHeaderClasses()} border-b border-secondary-200">
			{#if header}
				{@render header()}
			{:else if title}
				<div class="flex items-center justify-between">
					<h3 class={getTitleClasses()}>
						{title}
					</h3>
					{#if headerActions}
						{@render headerActions()}
					{/if}
				</div>
				{#if description}
					<p class={getDescriptionClasses()}>
						{description}
					</p>
				{/if}
			{/if}
		</div>
	{/if}
	
	<!-- Content -->
	<div class={getContentClasses()}>
		{@render children?.()}
	</div>
	
	<!-- Footer -->
	{#if footer}
		<div class="{getFooterClasses()} border-t border-secondary-200">
			{@render footer()}
		</div>
	{/if}
</div>