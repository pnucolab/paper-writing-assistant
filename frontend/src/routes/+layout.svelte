<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/ui/Sidebar.svelte';
	import { onMount } from 'svelte';
	import { setLocale } from '$lib/paraglide/runtime.js';

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
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<Sidebar />
	
	<main class="transition-all duration-300 ml-14">
		{@render children?.()}
	</main>
</div>
