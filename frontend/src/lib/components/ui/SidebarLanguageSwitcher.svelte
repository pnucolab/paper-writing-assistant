<script lang="ts">
	import { browser } from '$app/environment';
	import { setLocale, getLocale } from '$lib/paraglide/runtime.js';
	import Icon from '@iconify/svelte';

	interface Props {
		isExpanded: boolean;
	}

	let { isExpanded }: Props = $props();

	let showLanguageMenu = $state(false);

	const languages = [
		{ code: 'en', name: 'English' },
		{ code: 'ko', name: '한국어' }
	];

	let selectedLanguage = $derived(
		languages.find(lang => lang.code === getLocale()) || languages[0]
	);

	function toggleLanguageMenu() {
		if (isExpanded) {
			showLanguageMenu = !showLanguageMenu;
		}
	}

	function switchLanguage(newLocale: string) {
		setLocale(newLocale as any);
		showLanguageMenu = false;
	}

	// Watch for collapsed state to hide menu
	$effect(() => {
		if (!isExpanded) {
			showLanguageMenu = false;
		}
	});
</script>

<div>
	<button
		type="button"
		class="flex w-full items-center justify-start font-medium group relative transition-all duration-200 cursor-pointer p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
		onclick={toggleLanguageMenu}
		aria-haspopup="listbox"
		aria-expanded={showLanguageMenu}
	>
		<Icon icon="heroicons:globe-alt" class="w-5 h-5 flex-shrink-0" />
		<span
			class="whitespace-nowrap transition-opacity duration-300 ml-3 text-sm"
			class:opacity-100={isExpanded}
			class:opacity-0={!isExpanded}
		>
			{selectedLanguage.name}
		</span>
		{#if isExpanded}
			<Icon 
				icon="heroicons:chevron-down" 
				class="w-4 h-4 ml-auto transition-transform duration-200 {showLanguageMenu ? 'rotate-180' : ''}"
			/>
		{/if}
	</button>
	
	<!-- Language Options -->
	{#if showLanguageMenu && isExpanded}
		<div class="mt-2 flex flex-col gap-1 animate-fade-in">
			{#each languages as language}
				<button
					onclick={() => switchLanguage(language.code)}
					class="flex items-center w-full transition-all duration-200 py-2 px-4 rounded-lg text-sm hover:bg-gray-100 hover:text-gray-900"
					class:text-gray-900={getLocale() === language.code}
					class:bg-gray-100={getLocale() === language.code}
					class:text-gray-600={getLocale() !== language.code}
					class:font-medium={getLocale() === language.code}
					class:font-normal={getLocale() !== language.code}
				>
					<span>{language.name}</span>
					{#if getLocale() === language.code}
						<Icon icon="heroicons:check" class="w-4 h-4 ml-auto text-green-600" />
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.2s ease-out;
	}
</style>