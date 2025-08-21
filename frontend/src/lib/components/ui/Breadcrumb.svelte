<script lang="ts">
	import Icon from '@iconify/svelte';
	
	interface BreadcrumbItem {
		label: string;
		href?: string;
		active?: boolean;
	}
	
	interface Props {
		items: BreadcrumbItem[];
		class?: string;
	}
	
	let { items, class: className = '' }: Props = $props();
</script>

<nav class="flex {className}" aria-label="Breadcrumb">
	<ol class="flex items-center space-x-2">
		{#each items as item, index}
			<li class="flex items-center">
				{#if index > 0}
					<Icon icon="heroicons:chevron-right" class="w-4 h-4 text-secondary-400 mx-2" />
				{/if}
				
				{#if item.href && !item.active}
					<a 
						href={item.href} 
						class="text-sm text-secondary-500 hover:text-secondary-700 transition-colors"
					>
						{item.label}
					</a>
				{:else}
					<span 
						class="text-sm font-medium"
						class:text-secondary-900={item.active}
						class:text-secondary-500={!item.active}
					>
						{item.label}
					</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>