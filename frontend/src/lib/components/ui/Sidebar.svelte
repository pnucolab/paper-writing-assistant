<script lang="ts">
	import { page } from '$app/stores';
	import SidebarItem from './SidebarItem.svelte';
	import Icon from '@iconify/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';

	let isExpanded = $state(false);

	let navigation = $derived([
		{
			name: m.navigation_newPaper(),
			href: '/spwa/drafts',
			icon: 'heroicons:plus'
		},
		{
			name: m.navigation_drafts(),
			href: '/spwa/revisions',
			icon: 'heroicons:document-text'
		},
		{
			name: m.navigation_prompts(),
			href: '/spwa/prompts',
			icon: 'heroicons:command-line'
		},
		{
			name: m.navigation_settings(),
			href: '/spwa/settings',
			icon: 'heroicons:cog-6-tooth'
		},
		{
			name: m.navigation_backup(),
			href: '/spwa/backup',
			icon: 'heroicons:arrow-down-tray'
		}
	]);

	function handleMouseEnter() {
		isExpanded = true;
	}

	function handleMouseLeave() {
		isExpanded = false;
	}

	// Force reactivity when language changes
	$effect(() => {
		getLocale(); // Subscribe to language changes
	});
</script>

<aside
	class="fixed left-0 top-14 h-[calc(100%-3.5rem)] z-10 transition-all duration-300 bg-white border-r border-gray-200"
	class:w-60={isExpanded}
	class:w-14={!isExpanded}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
>
	<div class="overflow-hidden h-full flex flex-col p-2">
		<nav class="flex flex-col gap-1">
			{#each navigation as item}
				<SidebarItem
					name={item.name}
					href={item.href}
					icon={item.icon}
					{isExpanded}
				/>
			{/each}
		</nav>

	</div>
</aside>