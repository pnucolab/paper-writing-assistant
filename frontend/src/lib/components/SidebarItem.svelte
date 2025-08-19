<script lang="ts">
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';

	interface Props {
		name: string;
		href: string;
		icon: string;
		isExpanded: boolean;
	}

	let { name, href, icon, isExpanded }: Props = $props();

	let isCurrent = $derived($page.url.pathname === href);
</script>

<a
	{href}
	class="flex items-center justify-start font-medium group relative transition-all duration-200 p-2 rounded-lg hover:bg-gray-100"
	class:bg-gray-100={isCurrent}
	class:text-gray-900={isCurrent}
	class:text-gray-600={!isCurrent}
	class:font-semibold={isCurrent}
	class:font-normal={!isCurrent}
>
	<Icon {icon} class="w-5 h-5 flex-shrink-0" />
	<span
		class="whitespace-nowrap transition-opacity duration-300 ml-3 text-sm"
		class:opacity-100={isExpanded}
		class:opacity-0={!isExpanded}
	>
		{name}
	</span>
</a>