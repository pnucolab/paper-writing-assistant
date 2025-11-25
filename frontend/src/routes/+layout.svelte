<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/ui/Navbar.svelte';
	import Sidebar from '$lib/components/ui/Sidebar.svelte';
	import { onMount } from 'svelte';
	import { setLocale } from '$lib/paraglide/runtime.js';
	import { page } from '$app/stores';

	let { children } = $props();

	// Auto-detect user language on first visit
	onMount(() => {
		// Check if language preference is already saved
		const savedLocale = localStorage.getItem('preferred-locale');
		
		if (!savedLocale) {
			// Get browser language preference
			const browserLanguage = navigator.language.toLowerCase();
			const supportedLanguages = ['en', 'ko'];
			
			// Try exact match first (e.g., 'ko')
			let detectedLanguage = supportedLanguages.find(lang => 
				browserLanguage === lang || browserLanguage.startsWith(lang + '-')
			);
			
			// Default to English if no match
			if (!detectedLanguage) {
				detectedLanguage = 'en';
			}
			
			// Set the detected language
			setLocale(detectedLanguage as any);
			localStorage.setItem('preferred-locale', detectedLanguage);
		} else {
			// Use saved preference
			setLocale(savedLocale as any);
		}
	});

	// Show sidebar only for /spwa routes
	let showSidebar = $derived($page.url.pathname.startsWith('/spwa'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<Navbar />
	{#if showSidebar}
		<Sidebar />
	{/if}

	<main class="transition-all duration-300 pt-14" class:ml-14={showSidebar}>
		{@render children?.()}
	</main>
</div>
