<script lang="ts">
	import { page } from '$app/stores';
	import SidebarItem from './SidebarItem.svelte';
	import SidebarLanguageSwitcher from './SidebarLanguageSwitcher.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';

	let isExpanded = $state(false);

	let navigation = $derived([
		{
			name: m.navigation_home(),
			href: '/',
			icon: 'heroicons:home'
		},
		{
			name: m.navigation_newPaper(),
			href: '/drafts',
			icon: 'heroicons:plus'
		},
		{
			name: m.navigation_drafts(),
			href: '/revisions',
			icon: 'heroicons:document-text'
		},
		{
			name: m.navigation_settings(),
			href: '/settings',
			icon: 'heroicons:cog-6-tooth'
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
	class="fixed left-0 top-0 h-full z-10 transition-all duration-300 bg-white border-r border-gray-200"
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
		
		<!-- Separator -->
		<div class="border-t border-gray-200 my-4"></div>
		
		<!-- Language Switcher -->
		<div>
			<SidebarLanguageSwitcher {isExpanded} />
		</div>
		
		<!-- Spacer to push everything else to top -->
		<div class="mt-auto"></div>
	</div>
</aside>