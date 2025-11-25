<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	const tools = $derived([
		{
			name: m.main_tool_spwa_name(),
			description: m.main_tool_spwa_description(),
			href: '/spwa',
			icon: 'heroicons:document-text',
			status: 'available'
		},
		{
			name: m.main_tool_courier_name(),
			description: m.main_tool_courier_description(),
			href: '#',
			icon: 'heroicons:paper-airplane',
			status: 'coming-soon'
		}
	]);
</script>

<div class="min-h-screen bg-primary-50">
	<!-- Hero Section -->
	<div class="relative overflow-hidden bg-white">
		<div class="absolute inset-0 overflow-hidden pointer-events-none">
			<div class="absolute -top-40 -right-32 w-80 h-80 bg-primary-100/30 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
			<div class="absolute -bottom-40 -left-32 w-80 h-80 bg-primary-200/20 rounded-full mix-blend-multiply filter blur-xl animate-float animation-delay-2000"></div>
		</div>

		<div class="relative max-w-7xl mx-auto px-6 py-24">
			<div class="text-center">
				<h1 class="text-5xl sm:text-6xl font-bold text-primary-900 mt-12 mb-4 tracking-tight opacity-0 {mounted ? 'animate-fade-in-up' : ''}">
					{m.main_title()}
				</h1>

				<p class="text-2xl sm:text-3xl text-primary-600 font-semibold mb-8 tracking-tight opacity-0 {mounted ? 'animate-fade-in-up animation-delay-100' : ''}">
					{m.main_subtitle()}
				</p>

				<p class="text-xl text-secondary-600 mb-12 max-w-3xl mx-auto leading-relaxed font-light opacity-0 {mounted ? 'animate-fade-in-up animation-delay-200' : ''}">
					{m.main_description()}
				</p>
			</div>
		</div>
	</div>

	<!-- Tools Section -->
	<div class="bg-primary-50 border-b border-primary-100 py-20 px-6">
		<div class="max-w-5xl mx-auto">
			<h2 class="text-3xl md:text-4xl font-bold text-primary-950 mb-8 tracking-tight">{m.main_tools_title()}</h2>

			<div class="grid gap-6">
				{#each tools as tool, index}
					<div
						class="bg-white border border-primary-200 rounded-lg p-6 shadow-sm transition-all duration-200 opacity-0 {mounted ? 'animate-fade-in-up' : ''}"
						style="animation-delay: {300 + index * 100}ms"
						class:hover:shadow-md={tool.status === 'available'}
						class:opacity-60={tool.status === 'coming-soon'}
					>
						<div class="flex items-start gap-4">
							<div class="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
								<Icon icon={tool.icon} class="w-6 h-6 text-primary-600" />
							</div>
							<div class="flex-1">
								<div class="flex items-center gap-3 mb-2">
									<h3 class="text-lg font-semibold text-primary-950">{tool.name}</h3>
									{#if tool.status === 'coming-soon'}
										<span class="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">{m.main_tool_coming_soon()}</span>
									{/if}
								</div>
								<p class="text-base text-primary-900 leading-relaxed mb-4">{tool.description}</p>
								{#if tool.status === 'available'}
									<Button href={tool.href} variant="primary" size="sm">
										{m.main_tool_open()}
										<Icon icon="heroicons:arrow-right" class="w-4 h-4 ml-1" />
									</Button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- About Section -->
	<div class="bg-white border-t border-primary-100 py-20 px-6">
		<div class="max-w-5xl mx-auto">
			<h2 class="text-3xl md:text-4xl font-bold text-secondary-900 mb-6 tracking-tight">{m.main_about_title()}</h2>
			<div class="prose prose-gray max-w-none">
				<p class="text-xl text-secondary-700 leading-relaxed mb-6 font-light">
					{m.main_about_description()}
				</p>
				<ul class="text-base text-secondary-600 space-y-2 list-disc list-inside">
					<li><strong>{m.main_about_privacy()}</strong> {m.main_about_privacy_description()}</li>
					<li><strong>{m.main_about_opensource()}</strong> {m.main_about_opensource_description()}</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<footer class="bg-white py-8 border-t border-secondary-200">
		<div class="max-w-5xl mx-auto px-6">
			<div class="text-center text-sm text-secondary-500">
				<a href="https://pnucolab.com/" target="_blank" rel="noopener noreferrer" class="hover:text-primary-600 transition-colors">
					{m.main_footer_org()}
				</a> © 2025, all rights reserved.
			</div>
		</div>
	</footer>
</div>
