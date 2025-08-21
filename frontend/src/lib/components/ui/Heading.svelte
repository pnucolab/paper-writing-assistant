<script lang="ts">
	type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
	type HeadingSize = 'sm' | 'md' | 'lg' | 'xl';

	interface Props {
		level?: HeadingLevel;
		size?: HeadingSize;
		class?: string;
		children?: any;
	}

	let { 
		level = 'h3', 
		size = 'md', 
		class: className = '',
		children 
	}: Props = $props();

	function getHeadingClasses() {
		const baseClasses = 'font-semibold text-secondary-900 leading-tight';
		
		let sizeClasses = '';
		switch (size) {
			case 'sm':
				sizeClasses = 'text-sm';
				break;
			case 'lg':
				sizeClasses = 'text-lg';
				break;
			case 'xl':
				sizeClasses = 'text-xl';
				break;
			default:
				sizeClasses = 'text-base';
		}

		return `${baseClasses} ${sizeClasses} ${className}`;
	}
</script>

<svelte:element this={level} class={getHeadingClasses()}>
	{@render children?.()}
</svelte:element>