<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '@iconify/svelte';
	import CreateDraftModal from '$lib/components/drafts/CreateDraftModal.svelte';
	import DownloadOptions from '$lib/components/ui/DownloadOptions.svelte';

	import type { WorkflowStep, Citation } from '$lib/stores/drafts';
	import { getLLMSettings, type LLMConfig } from '$lib/utils/llm';

	// Draft interface
	interface Draft {
		id: string;
		projectTitle: string; // Project name (different from manuscript title)
		currentStep: WorkflowStep;
		isCompleted?: boolean; // True when writing step is finished
		createdAt: string;
		lastModified: string;
		// Extended workflow data - manuscript title, paperType, targetLength, citations stored in format step
		researchFocus?: string;
		paperOutline?: Array<{title: string; bulletPoints: string[]; citationIndices: number[]}>;
	}

	// State
	let drafts = $state<Draft[]>([]);
	let isCreatingDraft = $state(false);
	let llmConfigError = $state<string | null>(null);
	let hasValidLLMConfig = $state(false);
	let showCreateError = $state(false);
	let showCreateModal = $state(false);

	// LLM configuration check
	function checkLLMConfiguration() {
		try {
			const settings = getLLMSettings();
			hasValidLLMConfig = true;
			llmConfigError = null;
		} catch (error) {
			hasValidLLMConfig = false;
			llmConfigError = error instanceof Error ? error.message : 'Unknown error';
		}
	}

	function loadDrafts() {
		try {
			const saved = localStorage.getItem('paperwriter-drafts');
			if (saved) {
				drafts = JSON.parse(saved);
			}
		} catch (error) {
			console.error('Failed to load drafts:', error);
		}
	}

	function saveDrafts() {
		try {
			localStorage.setItem('paperwriter-drafts', JSON.stringify(drafts));
		} catch (error) {
			console.error('Failed to save drafts:', error);
		}
	}

	function showNewDraftModal() {
		// Check LLM configuration first
		if (!hasValidLLMConfig) {
			showCreateError = true;
			return;
		}
		
		showCreateError = false;
		showCreateModal = true;
	}

	async function handleCreateDraft(draftIdentifier: string, kebabId: string) {
		isCreatingDraft = true;
		
		try {
			const newDraft: Draft = {
				id: kebabId,
				projectTitle: draftIdentifier,
				currentStep: 'format',
				createdAt: new Date().toISOString(),
				lastModified: new Date().toISOString()
			};
			
			drafts = [newDraft, ...drafts];
			saveDrafts();
			
			// Close modal and navigate
			showCreateModal = false;
			await goto(`/drafts/new-paper?id=${newDraft.id}`);
		} catch (error) {
			console.error('Failed to create draft:', error);
			alert('Failed to create new draft');
		} finally {
			isCreatingDraft = false;
		}
	}

	function handleCloseModal() {
		showCreateModal = false;
	}

	async function openDraft(draft: Draft) {
		// Navigate to the draft's current step using new-paper page
		await goto(`/drafts/new-paper?id=${draft.id}#${draft.currentStep}`);
	}

	function deleteDraft(draft: Draft) {
		if (confirm(m.drafts_delete_confirm({ title: draft.projectTitle }))) {
			drafts = drafts.filter(d => d.id !== draft.id);
			saveDrafts();
			
			// Clean up localStorage for this draft
			try {
				localStorage.removeItem(`paperwriter-draft-${draft.id}-documents`);
				localStorage.removeItem(`paperwriter-draft-${draft.id}-focus`);
				localStorage.removeItem(`paperwriter-draft-${draft.id}-outline`);
				localStorage.removeItem(`paperwriter-draft-${draft.id}-format`);
			} catch (error) {
				console.error('Failed to cleanup draft data:', error);
			}
		}
	}

	function getStepDisplayName(step: WorkflowStep, isCompleted?: boolean): string {
		if (isCompleted) {
			return m.drafts_completed();
		}
		
		switch (step) {
			case 'format': return m.newpaper_step_format_title();
			case 'documents': return m.newpaper_step_documents_title();
			case 'focus': return m.newpaper_step_focus_title();
			case 'outline': return m.newpaper_step_outline_title();
			case 'writing': return m.newpaper_step_writing_title();
			default: return step;
		}
	}

	function getStepProgress(draft: Draft): number {
		if (draft.isCompleted) {
			return 100;
		}
		
		const stepOrder: WorkflowStep[] = ['format', 'documents', 'focus', 'outline', 'writing'];
		const currentIndex = stepOrder.indexOf(draft.currentStep);
		return Math.round(((currentIndex + 1) / stepOrder.length) * 100);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Initialize on mount
	onMount(() => {
		loadDrafts();
		checkLLMConfiguration();
	});
</script>

<div class="max-w-7xl mx-auto px-6 py-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-semibold text-gray-900 mb-2">{m.cover_page_title()}</h1>
		<p class="text-gray-600">{m.cover_page_subtitle()}</p>
	</div>

	<!-- Drafts List -->
	<div class="space-y-6">
		{#if drafts.length === 0}
			<Card>
				<!-- LLM Configuration Warning -->
				{#if !hasValidLLMConfig}
					<div class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
						<div class="flex items-start">
							<Icon icon="heroicons:exclamation-triangle" class="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
							<div class="flex-1">
								<h3 class="text-sm font-medium text-amber-800 mb-1">
									{m.llm_config_warning_title()}
								</h3>
								<p class="text-sm text-amber-700 mb-3">
									{m.llm_config_warning_description()}
								</p>
								<Button
									href="/settings"
									variant="secondary"
									size="sm"
									iconLeft="heroicons:cog-6-tooth"
								>
									{m.llm_configure_button()}
								</Button>
							</div>
						</div>
					</div>
				{/if}

				<div class="text-center py-12">
					<Icon icon="heroicons:document-text" class="w-16 h-16 mx-auto mb-4 text-secondary-400" />
					<h3 class="text-lg font-medium text-secondary-900 mb-2">{m.drafts_no_drafts_yet()}</h3>
					<p class="text-secondary-600 mb-6">
						{m.cover_empty_state_message()}
					</p>
					<div class="flex flex-col items-center">
						<Button
							onclick={showNewDraftModal}
							variant="primary"
							iconLeft="heroicons:plus"
							disabled={isCreatingDraft || !hasValidLLMConfig}
						>
							{isCreatingDraft ? m.drafts_creating() : m.cover_create_new_paper()}
						</Button>
						{#if showCreateError && !hasValidLLMConfig}
							<p class="text-sm text-red-600 mt-2">
								{m.drafts_llm_config_required()}
							</p>
						{/if}
					</div>
				</div>
			</Card>
		{:else}
			<!-- Header with New Paper Button -->
			<div class="flex justify-between items-center mb-6">
				<div>
					<h2 class="text-xl font-semibold text-secondary-900">{m.cover_recent_drafts()}</h2>
					<p class="text-secondary-600">{m.cover_recent_drafts_description()}</p>
				</div>
				<div class="flex flex-col items-end">
					<Button
						onclick={showNewDraftModal}
						variant="primary"
						size="sm"
						iconLeft="heroicons:plus"
						disabled={isCreatingDraft || !hasValidLLMConfig}
					>
						{isCreatingDraft ? m.drafts_creating() : m.cover_create_new_paper()}
					</Button>
					{#if showCreateError && !hasValidLLMConfig}
						<p class="text-sm text-red-600 mt-1">
							{m.drafts_llm_config_required()}
						</p>
					{/if}
				</div>
			</div>


			{#each drafts as draft (draft.id)}
				<Card>
					<div class="space-y-4">
						<div class="flex items-start justify-between">
							<div class="flex-1 min-w-0 cursor-pointer" onclick={() => openDraft(draft)} role="button" tabindex="0">
								<div class="flex items-center space-x-3 mb-3">
									<div class="flex-shrink-0">
										<Icon icon="heroicons:document-text" class="w-8 h-8 text-primary-600" />
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center space-x-2">
											<h3 class="text-lg font-medium text-secondary-900 truncate">{draft.projectTitle}</h3>
											{#if draft.isCompleted}
												<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
													<Icon icon="heroicons:check-circle" class="w-3 h-3 mr-1" />
													Completed
												</span>
											{/if}
										</div>
										<p class="text-sm text-secondary-600">
											{formatDate(draft.lastModified)}
										</p>
									</div>
								</div>
								
								<!-- Progress Info -->
								<div class="mt-4">
									<div class="flex items-center justify-between mb-2">
										<span class="text-sm font-medium text-secondary-700">
											{getStepDisplayName(draft.currentStep, draft.isCompleted)}
										</span>
										<span class="text-sm text-secondary-500">
											{getStepProgress(draft)}%
										</span>
									</div>
									<div class="w-full bg-secondary-200 rounded-full h-2">
										<div 
											class="bg-primary-600 h-2 rounded-full transition-all duration-300" 
											style="width: {getStepProgress(draft)}%"
										></div>
									</div>
								</div>
								
								<!-- Created timestamp -->
								<div class="mt-4 text-xs text-secondary-500">
									<span>{m.cover_draft_created({ date: formatDate(draft.createdAt) })}</span>
								</div>
							</div>
							
							<!-- Actions -->
							<div class="flex items-start space-x-2 ml-4">
								<Button
									onclick={() => openDraft(draft)}
									variant="primary"
									size="sm"
									iconLeft="heroicons:arrow-right"
								>
									{m.cover_continue_draft()}
								</Button>
								<Button
									onclick={(e) => { e.stopPropagation(); deleteDraft(draft); }}
									variant="secondary"
									size="sm"
									iconLeft="heroicons:trash"
								>
									{m.cover_delete_draft()}
								</Button>
							</div>
						</div>

						<!-- Download Options for Completed Drafts -->
						{#if draft.isCompleted}
							<div class="border-t border-secondary-200 pt-4">
								<DownloadOptions 
									draftId={draft.id}
									projectTitle={draft.projectTitle}
									isCompleted={false}
								/>
							</div>
						{/if}
					</div>
				</Card>
			{/each}
		{/if}
	</div>
</div>

<!-- Create Draft Modal -->
<CreateDraftModal
	show={showCreateModal}
	isCreating={isCreatingDraft}
	onClose={handleCloseModal}
	onCreate={handleCreateDraft}
	existingIds={drafts.map(d => d.id)}
/>