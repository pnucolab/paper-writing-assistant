<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});
</script>

<div class="min-h-screen bg-secondary-50">
	<!-- Hero Section -->
	<div class="relative overflow-hidden bg-white">
		<!-- Subtle animated elements -->
		<div class="absolute inset-0 overflow-hidden pointer-events-none">
			<div class="absolute -top-40 -right-32 w-80 h-80 bg-primary-100/30 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
			<div class="absolute -bottom-40 -left-32 w-80 h-80 bg-primary-200/20 rounded-full mix-blend-multiply filter blur-xl animate-float animation-delay-2000"></div>
		</div>

		<div class="relative max-w-7xl mx-auto px-6 py-20">
			<div class="text-center">
				<!-- Badge -->
				<div class="mb-8 opacity-0 {mounted ? 'animate-fade-in-up' : ''}">
					<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 border border-primary-200">
						<Icon icon="heroicons:sparkles" class="w-4 h-4 mr-2" />
						{m.home_hero_badge()}
					</span>
				</div>

				<!-- Main heading -->
				<h1 class="text-4xl sm:text-5xl font-semibold text-secondary-900 mb-6 opacity-0 {mounted ? 'animate-fade-in-up animation-delay-200' : ''}">
					{m.home_hero_title()}<br />
					<span class="text-primary-600">{m.home_hero_title_highlight()}</span>
				</h1>

				<!-- Subtitle -->
				<p class="text-xl text-secondary-600 mb-8 max-w-3xl mx-auto leading-relaxed opacity-0 {mounted ? 'animate-fade-in-up animation-delay-400' : ''}">
					{m.home_hero_subtitle()}
				</p>

				<!-- CTA Buttons -->
				<div class="flex items-center justify-center mb-12 opacity-0 {mounted ? 'animate-fade-in-up animation-delay-600' : ''}">
					<Button
						href="/new-paper"
						variant="primary"
						size="lg"
						class="shadow-sm hover:shadow-md transition-all duration-200"
					>
						<Icon icon="heroicons:pencil-square" class="w-5 h-5 mr-2" />
						{m.home_hero_cta()}
					</Button>
				</div>
			</div>
		</div>
	</div>

	<!-- Features Section -->
	<div class="py-20">
		<div class="max-w-7xl mx-auto px-6">
			<div class="text-center mb-16">
				<span class="inline-block px-3 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full mb-4">
					{m.home_features_badge()}
				</span>
				<h2 class="text-3xl font-semibold text-secondary-900 mb-4">
					{m.home_features_title()}
				</h2>
				<p class="text-lg text-secondary-600 max-w-2xl mx-auto">
					{m.home_features_subtitle()}
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<!-- Feature 1 -->
				<div class="group bg-white rounded-lg p-6 border border-secondary-200 hover:border-primary-200 transition-all duration-200 hover:shadow-sm">
					<div class="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-700 transition-colors duration-200">
						<Icon icon="heroicons:document-plus" class="w-5 h-5" />
					</div>
					<h3 class="text-lg font-semibold text-secondary-900 mb-2">{m.home_features_citations_title()}</h3>
					<p class="text-secondary-600 text-sm leading-relaxed">
						{m.home_features_citations_description()}
					</p>
				</div>

				<!-- Feature 2 -->
				<div class="group bg-white rounded-lg p-6 border border-secondary-200 hover:border-primary-200 transition-all duration-200 hover:shadow-sm">
					<div class="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-700 transition-colors duration-200">
						<Icon icon="heroicons:light-bulb" class="w-5 h-5" />
					</div>
					<h3 class="text-lg font-semibold text-secondary-900 mb-2">{m.home_features_outline_title()}</h3>
					<p class="text-secondary-600 text-sm leading-relaxed">
						{m.home_features_outline_description()}
					</p>
				</div>

				<!-- Feature 3 -->
				<div class="group bg-white rounded-lg p-6 border border-secondary-200 hover:border-primary-200 transition-all duration-200 hover:shadow-sm">
					<div class="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-700 transition-colors duration-200">
						<Icon icon="heroicons:pencil" class="w-5 h-5" />
					</div>
					<h3 class="text-lg font-semibold text-secondary-900 mb-2">{m.home_features_section_title()}</h3>
					<p class="text-secondary-600 text-sm leading-relaxed">
						{m.home_features_section_description()}
					</p>
				</div>

				<!-- Feature 4 -->
				<div class="group bg-white rounded-lg p-6 border border-secondary-200 hover:border-primary-200 transition-all duration-200 hover:shadow-sm">
					<div class="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-700 transition-colors duration-200">
						<Icon icon="heroicons:check-badge" class="w-5 h-5" />
					</div>
					<h3 class="text-lg font-semibold text-secondary-900 mb-2">{m.home_features_quality_title()}</h3>
					<p class="text-secondary-600 text-sm leading-relaxed">
						{m.home_features_quality_description()}
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Process Section -->
	<div class="py-20 bg-white border-t border-secondary-200">
		<div class="max-w-7xl mx-auto px-6">
			<div class="text-center mb-16">
				<h2 class="text-3xl font-semibold text-secondary-900 mb-4">
					{m.home_process_title()}
				</h2>
				<p class="text-lg text-secondary-600 max-w-2xl mx-auto">
					{m.home_process_subtitle()}
				</p>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div class="relative">
					<div class="bg-secondary-50 rounded-lg p-6 border border-secondary-200 h-full">
						<div class="w-10 h-10 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center font-semibold text-lg mb-4">
							1
						</div>
						<h3 class="text-lg font-semibold text-secondary-900 mb-2">{m.home_process_step1_title()}</h3>
						<p class="text-secondary-600 text-sm leading-relaxed">
							{m.home_process_step1_description()}
						</p>
					</div>
					<!-- Arrow -->
					<div class="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
						<Icon icon="heroicons:arrow-right" class="w-6 h-6 text-secondary-400" />
					</div>
				</div>

				<div class="relative">
					<div class="bg-secondary-50 rounded-lg p-6 border border-secondary-200 h-full">
						<div class="w-10 h-10 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center font-semibold text-lg mb-4">
							2
						</div>
						<h3 class="text-lg font-semibold text-secondary-900 mb-2">{m.home_process_step2_title()}</h3>
						<p class="text-secondary-600 text-sm leading-relaxed">
							{m.home_process_step2_description()}
						</p>
					</div>
					<!-- Arrow -->
					<div class="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
						<Icon icon="heroicons:arrow-right" class="w-6 h-6 text-secondary-400" />
					</div>
				</div>

				<div class="bg-secondary-50 rounded-lg p-6 border border-secondary-200 h-full">
					<div class="w-10 h-10 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center font-semibold text-lg mb-4">
						3
					</div>
					<h3 class="text-lg font-semibold text-secondary-900 mb-2">{m.home_process_step3_title()}</h3>
					<p class="text-secondary-600 text-sm leading-relaxed">
						{m.home_process_step3_description()}
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- CTA Section -->
	<div class="py-20 bg-primary-600 text-white">
		<div class="max-w-7xl mx-auto px-6 text-center">
			<h2 class="text-3xl font-semibold mb-4">
				{m.home_cta_title()}
			</h2>
			<p class="text-lg mb-8 text-primary-100">
				{m.home_cta_subtitle()}
			</p>
			<Button
				href="/new-paper"
				variant="secondary"
				size="lg"
				class="bg-white text-primary-600 hover:bg-primary-50 shadow-sm hover:shadow-md transition-all duration-200"
			>
				<Icon icon="heroicons:rocket-launch" class="w-5 h-5 mr-2" />
				{m.home_cta_button()}
			</Button>
		</div>
	</div>
</div>

<style>
	@keyframes float {
		0%, 100% {
			transform: translate(0px, 0px) scale(1);
		}
		50% {
			transform: translate(20px, -20px) scale(1.05);
		}
	}

	@keyframes fade-in-up {
		0% {
			opacity: 0;
			transform: translateY(20px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-float {
		animation: float 8s ease-in-out infinite;
	}

	.animate-fade-in-up {
		animation: fade-in-up 0.6s ease-out forwards;
	}

	.animation-delay-200 {
		animation-delay: 0.2s;
	}

	.animation-delay-400 {
		animation-delay: 0.4s;
	}

	.animation-delay-600 {
		animation-delay: 0.6s;
	}


	.animation-delay-2000 {
		animation-delay: 2s;
	}
</style>
