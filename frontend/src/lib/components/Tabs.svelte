<script lang="ts">
	interface Tab {
		id: string;
		label: string;
	}

	interface Props {
		tabs: Tab[];
		activeTab: string;
		onTabChange: (tabId: string) => void;
		class?: string;
	}

	let { tabs, activeTab, onTabChange, class: className = '' }: Props = $props();
</script>

<div class="{className}">
	<nav class="flex space-x-2 border-b border-secondary-200">
		{#each tabs as tab}
			<a
				onclick={() => onTabChange(tab.id)}
				href="#{tab.id}"
				tabindex="0"
				class="relative px-4 py-3 font-medium text-sm transition-all duration-200 border-b-2 cursor-pointer select-none transform active:scale-95"
				class:border-primary-600={activeTab === tab.id}
				class:text-primary-600={activeTab === tab.id}
				class:border-transparent={activeTab !== tab.id}
				class:text-secondary-600={activeTab !== tab.id}
				class:hover:text-secondary-800={activeTab !== tab.id}
				class:hover:border-secondary-300={activeTab !== tab.id}
				aria-selected={activeTab === tab.id}
				role="tab"
			>
				<span class="whitespace-nowrap">{tab.label}</span>
			</a>
		{/each}
	</nav>
</div>