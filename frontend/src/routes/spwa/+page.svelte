<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Footer from '$lib/components/ui/Footer.svelte';
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});
</script>

<div class="min-h-screen bg-primary-50">
	<!-- Hero Section -->
	<div class="relative overflow-hidden bg-white">
		<!-- Subtle animated elements -->
		<div class="absolute inset-0 overflow-hidden pointer-events-none">
			<div class="absolute -top-40 -right-32 w-80 h-80 bg-primary-100/30 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
			<div class="absolute -bottom-40 -left-32 w-80 h-80 bg-primary-200/20 rounded-full mix-blend-multiply filter blur-xl animate-float animation-delay-2000"></div>
		</div>

		<div class="relative max-w-7xl mx-auto px-6 py-24">
			<div class="text-center">
				<!-- Main heading -->
				<h1 class="text-4xl sm:text-5xl font-semibold text-secondary-900 mt-12 mb-6 opacity-0 {mounted ? 'animate-fade-in-up' : ''}">
					{m.home_hero_title()}<br />
					<span class="text-primary-600">{m.home_hero_title_highlight()}</span>
				</h1>

				<!-- Subtitle -->
				<p class="text-xl text-secondary-600 mb-8 max-w-3xl mx-auto leading-relaxed opacity-0 {mounted ? 'animate-fade-in-up animation-delay-200' : ''}">
					{m.home_hero_subtitle()}
				</p>

				<!-- CTA Buttons -->
				<div class="flex items-center justify-center mb-12 opacity-0 {mounted ? 'animate-fade-in-up animation-delay-400' : ''}">
					<Button
						href="/spwa/drafts"
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

	<!-- Design Rationale - Why This Tool Exists -->
	<div class="bg-primary-50 border-b border-primary-100 py-20">
		<div class="max-w-5xl mx-auto px-6">
			<h2 class="text-3xl md:text-4xl font-bold text-primary-950 mb-8 tracking-tight">
				{m.home_rationale_title()}
			</h2>
			<div class="prose prose-gray max-w-none">
				<p class="text-xl text-primary-900 leading-relaxed mb-6 font-light">
					{m.home_rationale_intro()}
				</p>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
					<div class="bg-white border border-primary-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
						<h3 class="text-lg font-semibold text-primary-950 mb-3 flex items-center">
							<span class="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
							{m.home_rationale_traceable_title()}
						</h3>
						<p class="text-base text-primary-900 leading-relaxed">
							{m.home_rationale_traceable_description()}
						</p>
					</div>

					<div class="bg-white border border-primary-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
						<h3 class="text-lg font-semibold text-primary-950 mb-3 flex items-center">
							<span class="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
							{m.home_rationale_human_control_title()}
						</h3>
						<p class="text-base text-primary-900 leading-relaxed">
							{m.home_rationale_human_control_description()}
						</p>
					</div>

					<div class="bg-white border border-primary-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
						<h3 class="text-lg font-semibold text-primary-950 mb-3 flex items-center">
							<span class="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
							{m.home_rationale_language_barrier_title()}
						</h3>
						<p class="text-base text-primary-900 leading-relaxed">
							{m.home_rationale_language_barrier_description()}
						</p>
					</div>

					<div class="bg-white border border-primary-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
						<h3 class="text-lg font-semibold text-primary-950 mb-3 flex items-center">
							<span class="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
							{m.home_rationale_quality_title()}
						</h3>
						<p class="text-base text-primary-900 leading-relaxed">
							{m.home_rationale_quality_description()}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- How It Works - Core Section -->
	<div id="how-it-works" class="bg-white border-b border-primary-100 py-20">
		<div class="max-w-5xl mx-auto px-6">
			<h2 class="text-3xl md:text-4xl font-bold text-secondary-900 mb-6 tracking-tight">
				{m.home_how_it_works_title()}
			</h2>
			<p class="text-xl text-secondary-700 mb-12 leading-relaxed font-light">
				{m.home_how_it_works_intro()}
			</p>

			<div class="space-y-10">
				<!-- Step 1: Research Focus -->
				<div class="border-l-4 border-primary-600 pl-8">
					<div class="flex items-start">
						<span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-600 text-white text-base font-bold -ml-[52px] mr-6 shadow-sm">
							1
						</span>
						<div>
							<h3 class="text-xl font-bold text-secondary-800 mb-3">
								{m.home_step1_title()}
							</h3>
							<p class="text-base text-secondary-700 leading-relaxed mb-4">
								{m.home_step1_description()}
							</p>
							<ul class="text-sm text-secondary-600 space-y-2 list-disc list-inside ml-1">
								<li>{m.home_step1_bullet1()}</li>
								<li>{m.home_step1_bullet2()}</li>
								<li>{m.home_step1_bullet3()}</li>
							</ul>
						</div>
					</div>
				</div>

				<!-- Step 2: Document & Outline -->
				<div class="border-l-4 border-primary-600 pl-8">
					<div class="flex items-start">
						<span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-600 text-white text-base font-bold -ml-[52px] mr-6 shadow-sm">
							2
						</span>
						<div>
							<h3 class="text-xl font-bold text-secondary-800 mb-3">
								{m.home_step2_title()}
							</h3>
							<p class="text-base text-secondary-600 leading-relaxed mb-4">
								{m.home_step2_description()}
							</p>
							<ul class="text-sm text-secondary-500 space-y-2 list-disc list-inside ml-1">
								<li>{m.home_step2_bullet1()}</li>
								<li>{m.home_step2_bullet2()}</li>
								<li>{m.home_step2_bullet3()}</li>
							</ul>
						</div>
					</div>
				</div>

				<!-- Step 3: Section Writing -->
				<div class="border-l-4 border-primary-600 pl-8">
					<div class="flex items-start">
						<span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-600 text-white text-base font-bold -ml-[52px] mr-6 shadow-sm">
							3
						</span>
						<div>
							<h3 class="text-xl font-bold text-secondary-800 mb-3">
								{m.home_step3_title()}
							</h3>
							<p class="text-base text-secondary-600 leading-relaxed mb-4">
								{m.home_step3_description()}
							</p>
							<ul class="text-sm text-secondary-500 space-y-2 list-disc list-inside ml-1">
								<li>{m.home_step3_bullet1()}</li>
								<li>{m.home_step3_bullet2()}</li>
								<li>{m.home_step3_bullet3()}</li>
							</ul>
						</div>
					</div>
				</div>

				<!-- Step 4: Review & Revise -->
				<div class="border-l-4 border-primary-600 pl-8">
					<div class="flex items-start">
						<span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-600 text-white text-base font-bold -ml-[52px] mr-6 shadow-sm">
							4
						</span>
						<div>
							<h3 class="text-xl font-bold text-secondary-800 mb-3">
								{m.home_step4_title()}
							</h3>
							<p class="text-base text-secondary-600 leading-relaxed mb-4">
								{m.home_step4_description()}
							</p>
							<ul class="text-sm text-secondary-500 space-y-2 list-disc list-inside ml-1">
								<li>{m.home_step4_bullet1()}</li>
								<li>{m.home_step4_bullet2()}</li>
								<li>{m.home_step4_bullet3()}</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Key Features -->
	<div class="bg-primary-50 border-b border-primary-100 py-20">
		<div class="max-w-5xl mx-auto px-6">
			<h2 class="text-3xl md:text-4xl font-bold text-primary-950 mb-10 tracking-tight">
				{m.home_features_title()}
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="bg-white border border-primary-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
					<h3 class="text-lg font-semibold text-primary-950 mb-3">
						{m.home_features_transparency_title()}
					</h3>
					<p class="text-base text-primary-900 leading-relaxed">
						{m.home_features_transparency_description()}
					</p>
				</div>

				<div class="bg-white border border-primary-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
					<h3 class="text-lg font-semibold text-primary-950 mb-3">
						{m.home_features_control_title()}
					</h3>
					<p class="text-base text-primary-900 leading-relaxed">
						{m.home_features_control_description()}
					</p>
				</div>

				<div class="bg-white border border-primary-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
					<h3 class="text-lg font-semibold text-primary-950 mb-3">
						{m.home_features_local_title()}
					</h3>
					<p class="text-base text-primary-900 leading-relaxed">
						{m.home_features_local_description()}
					</p>
				</div>

				<div class="bg-white border border-primary-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
					<h3 class="text-lg font-semibold text-primary-950 mb-3">
						{m.home_features_export_title()}
					</h3>
					<p class="text-base text-primary-900 leading-relaxed">
						{m.home_features_export_description()}
					</p>
				</div>
			</div>
		</div>
	</div>

	<Footer />
</div>
