<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { getLocale, setLocale } from '$lib/paraglide/runtime.js';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import Icon from '@iconify/svelte';

	let isMobileMenuOpen = $state(false);
	let isLanguageMenuOpen = $state(false);

	const menuItems = $derived([
		{
			name: 'Scientific Paper Writing Assistant',
			href: '/spwa'
		}
	]);

	const languages = [
		{ code: 'en', name: 'English', flag: '🇺🇸' },
		{ code: 'ko', name: '한국어', flag: '🇰🇷' }
	];

	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
		isLanguageMenuOpen = false;
	}

	function closeMobileMenu() {
		isMobileMenuOpen = false;
	}

	function toggleLanguageMenu() {
		isLanguageMenuOpen = !isLanguageMenuOpen;
	}

	function closeLanguageMenu() {
		isLanguageMenuOpen = false;
	}

	function switchLanguage(newLocale: string) {
		setLocale(newLocale as any);
		if (browser) {
			localStorage.setItem('preferred-locale', newLocale);
		}
		isLanguageMenuOpen = false;
	}

	function isActive(href: string): boolean {
		if (href === '/spwa') {
			return $page.url.pathname.startsWith('/spwa');
		}
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	// Force reactivity when language changes
	$effect(() => {
		getLocale();
	});
</script>

<nav class="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-14">
	<div class="h-full px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between h-full">
			<!-- Logo and Site Title -->
			<div class="flex items-center gap-6">
				<a href="/" class="text-lg font-semibold text-secondary-900 hover:text-primary-600 transition-colors">
					COLab Tools
				</a>

				<!-- Desktop Menu Items -->
				<div class="hidden md:flex items-center gap-1">
					{#each menuItems as item}
						<a
							href={item.href}
							class="px-3 py-1.5 text-sm font-medium transition-colors rounded-md"
							class:text-primary-600={isActive(item.href)}
							class:text-secondary-600={!isActive(item.href)}
							class:hover:text-primary-600={!isActive(item.href)}
							class:hover:bg-secondary-50={!isActive(item.href)}
						>
							{item.name}
						</a>
					{/each}
				</div>
			</div>

			<!-- Right side: Language + Settings + Mobile Menu -->
			<div class="flex items-center gap-1">
				<!-- Language Selector (Desktop) -->
				<div class="hidden md:block relative">
					<button
						onclick={toggleLanguageMenu}
						class="flex items-center gap-1 px-2 py-1.5 rounded-md text-secondary-600 hover:text-primary-600 hover:bg-secondary-50 transition-colors"
						aria-label="Select language"
						aria-haspopup="listbox"
						aria-expanded={isLanguageMenuOpen}
					>
						<Icon icon="heroicons:globe-alt" class="w-5 h-5" />
						<span class="text-sm font-medium uppercase">{getLocale()}</span>
						<Icon icon="heroicons:chevron-down" class="w-3.5 h-3.5 transition-transform duration-200 {isLanguageMenuOpen ? 'rotate-180' : ''}" />
					</button>

					<!-- Language Dropdown -->
					{#if isLanguageMenuOpen}
						<div class="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
							{#each languages as language}
								<button
									onclick={() => switchLanguage(language.code)}
									class="flex items-center justify-between w-full px-3 py-2 text-sm transition-colors hover:bg-secondary-50"
									class:text-primary-600={getLocale() === language.code}
									class:font-medium={getLocale() === language.code}
									class:text-secondary-700={getLocale() !== language.code}
								>
									<span>{language.name}</span>
									{#if getLocale() === language.code}
										<Icon icon="heroicons:check" class="w-4 h-4 text-primary-600" />
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Mobile Hamburger Button -->
				<button
					onclick={toggleMobileMenu}
					class="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-secondary-600 hover:bg-secondary-100 transition-colors"
					aria-label="Toggle menu"
				>
					{#if isMobileMenuOpen}
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					{:else}
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- Mobile Menu -->
	{#if isMobileMenuOpen}
		<div class="md:hidden border-t border-gray-200 bg-white shadow-lg">
			<div class="px-4 py-3 space-y-1">
				{#each menuItems as item}
					<a
						href={item.href}
						onclick={closeMobileMenu}
						class="block px-3 py-3 rounded-lg text-sm font-medium transition-colors"
						class:bg-primary-50={isActive(item.href)}
						class:text-primary-700={isActive(item.href)}
						class:text-secondary-600={!isActive(item.href)}
						class:hover:bg-secondary-100={!isActive(item.href)}
					>
						{item.name}
					</a>
				{/each}

				<!-- Divider -->
				<div class="border-t border-gray-200 my-2"></div>

				<!-- Language Selection in Mobile Menu -->
				<div class="px-3 py-2">
					<p class="text-xs font-medium text-secondary-500 uppercase tracking-wide mb-2">Language</p>
					<div class="flex gap-2">
						{#each languages as language}
							<button
								onclick={() => { switchLanguage(language.code); closeMobileMenu(); }}
								class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
								class:bg-primary-50={getLocale() === language.code}
								class:text-primary-700={getLocale() === language.code}
								class:text-secondary-600={getLocale() !== language.code}
								class:hover:bg-secondary-100={getLocale() !== language.code}
							>
								{language.name}
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
</nav>

<!-- Overlay for mobile menu -->
{#if isMobileMenuOpen}
	<button
		onclick={closeMobileMenu}
		class="md:hidden fixed inset-0 z-40 bg-black/20"
		aria-label="Close menu"
		style="top: 56px;"
	></button>
{/if}
