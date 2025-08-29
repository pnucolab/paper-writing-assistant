<script lang="ts">
	type LabelSize = 'sm' | 'md' | 'lg';

	interface Props {
		for: string;
		required?: boolean;
		size?: LabelSize;
		class?: string;
		children?: any;
	}

	let {
		for: forId,
		required = false,
		size = 'md',
		class: className = '',
		children
	}: Props = $props();

	function getLabelClasses() {
		const baseClasses = [
			'block font-medium',
			'text-secondary-700'               // Secondary text from style guide
		];
		
		let sizeClasses = '';
		switch (size) {
			case 'sm':
				sizeClasses = 'text-xs mb-1';
				break;
			case 'lg':
				sizeClasses = 'text-base mb-3';
				break;
			default:
				sizeClasses = 'text-sm mb-2';
		}
		
		return [...baseClasses, sizeClasses, className].join(' ');
	}
</script>

<label 
	for={forId}
	class={getLabelClasses()}
>
	{@render children?.()}
	{#if required}
		<span class="text-red-500">*</span>
	{/if}
</label>