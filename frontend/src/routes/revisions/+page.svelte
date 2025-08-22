<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '@iconify/svelte';
	import EnhancedTiptapEditor from '$lib/components/editor/EnhancedTiptapEditor.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import FileDrop from '$lib/components/ui/FileDrop.svelte';
	// i18n
	import { m } from '$lib/paraglide/messages.js';
	
	// OpenRouter integration
	import { LLMClient, getLLMSettings } from '$lib/utils/llm';
	
	// Markdown processing
	import { marked } from 'marked';

	interface RevisionProject {
		id: string;
		title: string;
		source: 'draft' | 'upload';
		sourceId?: string; // ID of draft if imported from drafts
		content: string;
		originalContent: string;
		createdAt: string;
		lastModified: string;
		aiSuggestions?: AISuggestion[];
		validationResults?: ValidationResult[];
	}

	interface AISuggestion {
		id: string;
		type: 'grammar' | 'structure' | 'clarity' | 'citation' | 'content';
		severity: 'low' | 'medium' | 'high';
		title: string;
		description: string;
		suggestion: string;
		location?: {
			start: number;
			end: number;
		};
		applied: boolean;
	}

	interface ValidationResult {
		id: string;
		type: 'fact_check' | 'citation_verify' | 'plagiarism' | 'methodology';
		status: 'valid' | 'questionable' | 'invalid';
		title: string;
		description: string;
		sources?: string[];
	}

	interface Draft {
		id: string;
		projectTitle: string;
		currentStep: string;
		createdAt: string;
		lastModified: string;
		isCompleted?: boolean;
		content?: string;
	}

	// State
	let revisionProjects = $state<RevisionProject[]>([]);
	let selectedProject = $state<RevisionProject | null>(null);
	let editorContent = $state('');
	let showUploadModal = $state(false);
	let showImportModal = $state(false);
	let availableDrafts = $state<Draft[]>([]);
	let isGeneratingSuggestions = $state(false);
	let isValidating = $state(false);
	let llmClient = $state<LLMClient | null>(null);
	let hasValidLLMConfig = $state(false);

	// File upload (handled by FileDrop component)

	// Check LLM configuration
	function checkLLMConfiguration() {
		try {
			const settings = getLLMSettings();
			llmClient = new LLMClient(settings);
			hasValidLLMConfig = true;
		} catch (error) {
			hasValidLLMConfig = false;
			llmClient = null;
		}
	}

	// Load revision projects from localStorage
	function loadRevisionProjects() {
		try {
			const saved = localStorage.getItem('paperwriter-revisions');
			if (saved) {
				revisionProjects = JSON.parse(saved);
			}
		} catch (error) {
			console.error('Failed to load revision projects:', error);
		}
	}

	// Save revision projects to localStorage
	function saveRevisionProjects() {
		try {
			localStorage.setItem('paperwriter-revisions', JSON.stringify(revisionProjects));
		} catch (error) {
			console.error('Failed to save revision projects:', error);
		}
	}

	// Load available drafts
	function loadAvailableDrafts() {
		try {
			const saved = localStorage.getItem('paperwriter-drafts');
			if (saved) {
				const drafts = JSON.parse(saved);
				// Only show completed drafts
				availableDrafts = drafts.filter((draft: Draft) => draft.isCompleted);
			}
		} catch (error) {
			console.error('Failed to load drafts:', error);
		}
	}

	// Check if a draft has already been imported
	function isDraftAlreadyImported(draftId: string): boolean {
		return revisionProjects.some(project => 
			project.source === 'draft' && project.sourceId === draftId
		);
	}

	// Find existing revision project for a draft
	function findExistingRevision(draftId: string): RevisionProject | null {
		return revisionProjects.find(project => 
			project.source === 'draft' && project.sourceId === draftId
		) || null;
	}

	// Open existing revision or import new one
	async function handleDraftAction(draft: Draft) {
		const existingRevision = findExistingRevision(draft.id);
		if (existingRevision) {
			// Open existing revision
			showImportModal = false;
			selectProject(existingRevision);
		} else {
			// Import new revision
			await importFromDraft(draft);
		}
	}

	// File upload handling
	async function handleFileUpload(file: File) {
		try {
			let content = '';
			const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
			
			if (fileExtension === '.txt' || fileExtension === '.md') {
				content = await file.text();
			} else if (fileExtension === '.docx') {
				// For now, show error for DOCX - would need mammoth.js or similar
				alert('DOCX support coming soon. Please use .md or .txt files.');
				return;
			}

			const newProject: RevisionProject = {
				id: crypto.randomUUID(),
				title: file.name.replace(/\.[^/.]+$/, ""),
				source: 'upload',
				content: content,
				originalContent: content,
				createdAt: new Date().toISOString(),
				lastModified: new Date().toISOString()
			};

			revisionProjects = [newProject, ...revisionProjects];
			saveRevisionProjects();
			showUploadModal = false;
			selectProject(newProject);
			alert(m.revisions_file_uploaded());

		} catch (error) {
			console.error('Failed to upload file:', error);
			alert(m.revisions_upload_error());
		}
	}

	// Import from drafts
	async function importFromDraft(draft: Draft): Promise<RevisionProject | null> {
		try {
			// Load complete draft data
			const draftData = loadCompleteDraftData(draft.id);
			if (!draftData?.content) {
				alert('No content found in draft');
				return null;
			}

			const newProject: RevisionProject = {
				id: crypto.randomUUID(),
				title: draft.projectTitle,
				source: 'draft',
				sourceId: draft.id,
				content: draftData.content,
				originalContent: draftData.content,
				createdAt: new Date().toISOString(),
				lastModified: new Date().toISOString()
			};

			revisionProjects = [newProject, ...revisionProjects];
			saveRevisionProjects();
			showImportModal = false;
			selectProject(newProject);

			return newProject;

		} catch (error) {
			console.error('Failed to import draft:', error);
			alert('Failed to import draft');
			return null;
		}
	}

	// Load complete draft data (similar to downloads.ts)
	function loadCompleteDraftData(draftId: string) {
		try {
			const mainDrafts = JSON.parse(localStorage.getItem('paperwriter-drafts') || '[]');
			const mainDraft = mainDrafts.find((d: any) => d.id === draftId);
			
			if (!mainDraft) return null;

			// Load writing data
			const writingData = localStorage.getItem(`paperwriter-draft-${draftId}-writing`);
			if (writingData) {
				const writing = JSON.parse(writingData);
				return {
					...mainDraft,
					content: writing.content || writing.paperContent
				};
			}

			return mainDraft;
		} catch (error) {
			console.error('Failed to load complete draft data:', error);
			return null;
		}
	}

	// Select project
	function selectProject(project: RevisionProject) {
		selectedProject = project;
		// TiptapEditor handles markdown directly, no need to convert
		editorContent = project.content;
		
		// Update URL hash for bookmarking/sharing
		if (browser) {
			window.location.hash = project.id;
		}
	}

	// Generate AI suggestions
	async function generateAISuggestions() {
		if (!selectedProject || !llmClient) return;

		isGeneratingSuggestions = true;
		try {
			const prompt = `Please analyze the following academic paper and provide revision suggestions. Focus on:
1. Grammar and language clarity
2. Structural improvements
3. Content gaps or weaknesses
4. Citation and referencing issues

Paper content:
${selectedProject.content}

Provide specific, actionable suggestions with locations where possible.`;

			const response = await llmClient.chatCompletion(
				'You are an expert academic writing assistant.',
				prompt
			);
			
			// Parse AI response into structured suggestions (simplified for now)
			const suggestions: AISuggestion[] = [{
				id: crypto.randomUUID(),
				type: 'structure',
				severity: 'medium',
				title: 'AI Analysis Complete',
				description: 'AI has analyzed your paper',
				suggestion: response.content,
				applied: false
			}];

			selectedProject.aiSuggestions = suggestions;
			selectedProject.lastModified = new Date().toISOString();
			saveRevisionProjects();

		} catch (error) {
			console.error('Failed to generate AI suggestions:', error);
			alert('Failed to generate AI suggestions');
		} finally {
			isGeneratingSuggestions = false;
		}
	}

	// Validate content with web browsing
	async function validateContent() {
		if (!selectedProject || !llmClient) return;

		isValidating = true;
		try {
			// This would integrate with web browsing capabilities
			// For now, we'll simulate the process
			const validationResults: ValidationResult[] = [{
				id: crypto.randomUUID(),
				type: 'fact_check',
				status: 'valid',
				title: 'Content Validation',
				description: 'Content validation completed (simulated)',
				sources: []
			}];

			selectedProject.validationResults = validationResults;
			selectedProject.lastModified = new Date().toISOString();
			saveRevisionProjects();

		} catch (error) {
			console.error('Failed to validate content:', error);
			alert('Failed to validate content');
		} finally {
			isValidating = false;
		}
	}

	// Update content
	function updateContent(newContent: string) {
		if (!selectedProject) return;
		
		// Only update if content actually changed to prevent reactive loops
		if (selectedProject.content !== newContent) {
			selectedProject.content = newContent;
			selectedProject.lastModified = new Date().toISOString();
			saveRevisionProjects();
		}
	}

	// Delete project
	function deleteProject(project: RevisionProject) {
		if (confirm(`Delete "${project.title}"?`)) {
			revisionProjects = revisionProjects.filter(p => p.id !== project.id);
			saveRevisionProjects();
			if (selectedProject?.id === project.id) {
				selectedProject = null;
				editorContent = '';
				// Clear URL hash when no project is selected
				if (browser) {
					window.location.hash = '';
				}
			}
		}
	}

	// Format date
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Handle URL query parameters and hash for automatic project creation/opening
	function handleUrlQuery() {
		if (!browser) return;
		
		const urlParams = new URLSearchParams(window.location.search);
		const draftId = urlParams.get('id'); // Unified parameter for draft import
		const projectId = window.location.hash.slice(1); // Hash for project opening
		
		if (draftId) {
			// Try to import from draft
			handleDraftImportFromUrl(draftId);
		} else if (projectId) {
			// Try to open existing project
			handleProjectOpenFromUrl(projectId);
		}
	}
	
	// Handle draft import from URL
	async function handleDraftImportFromUrl(draftId: string) {
		// Load drafts if not already loaded
		if (availableDrafts.length === 0) {
			loadAvailableDrafts();
		}
		
		// Find the draft
		const draft = availableDrafts.find(d => d.id === draftId);
		if (!draft) {
			console.warn(`Draft with ID ${draftId} not found`);
			// Remove query parameter even if draft not found
			goto(window.location.pathname, { replaceState: true });
			return;
		}
		
		// Check if already imported
		const existingRevision = findExistingRevision(draftId);
		if (existingRevision) {
			// Open existing revision and update URL
			selectProject(existingRevision);
			goto(window.location.pathname + '#' + existingRevision.id, { replaceState: true });
		} else {
			// Import new revision
			const newProject = await importFromDraft(draft);
			if (newProject) {
				// Update URL with hash after successful import
				goto(window.location.pathname + '#' + newProject.id, { replaceState: true });
			} else {
				// Remove query parameter if import failed
				goto(window.location.pathname, { replaceState: true });
			}
		}
	}
	
	// Handle project opening from URL
	function handleProjectOpenFromUrl(projectId: string) {
		const project = revisionProjects.find(p => p.id === projectId);
		if (project) {
			selectProject(project);
		} else {
			console.warn(`Revision project with ID ${projectId} not found`);
		}
	}

	// Initialize on mount
	onMount(() => {
		loadRevisionProjects();
		loadAvailableDrafts();
		checkLLMConfiguration();
		
		// Handle URL query parameters after loading data
		setTimeout(() => {
			handleUrlQuery();
		}, 100);
	});
</script>

<div class="max-w-7xl mx-auto px-6 py-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-semibold text-gray-900 mb-2">{m.revisions_page_title()}</h1>
		<p class="text-gray-600">{m.revisions_page_description()}</p>
	</div>


	<div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
		<!-- Sidebar: Revisions List -->
		<div class="lg:col-span-1">
			<Card>
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-semibold text-gray-900">Revisions</h2>
					</div>

					{#if revisionProjects.length === 0}
						<div class="text-center py-8">
							<Icon icon="heroicons:document-text" class="w-12 h-12 mx-auto mb-4 text-gray-400" />
							<h3 class="text-sm font-medium text-gray-900 mb-2">{m.revisions_no_revisions()}</h3>
							<p class="text-xs text-gray-600 mb-4">{m.revisions_create_first()}</p>
							<div class="space-y-2">
								<Button
									onclick={() => showUploadModal = true}
									variant="primary"
									size="sm"
									iconLeft="heroicons:arrow-up-tray"
									class="w-full"
								>
									{m.revisions_upload_button()}
								</Button>
								<Button
									onclick={() => { loadAvailableDrafts(); showImportModal = true; }}
									variant="secondary"
									size="sm"
									iconLeft="heroicons:document-duplicate"
									class="w-full"
								>
									{m.revisions_import_from_drafts()}
								</Button>
							</div>
						</div>
					{:else}
						<div class="space-y-4">
							<div class="space-y-2">
								{#each revisionProjects as project (project.id)}
									<div 
										class="p-3 rounded-lg border cursor-pointer transition-colors"
										class:bg-blue-50={selectedProject?.id === project.id}
										class:border-blue-200={selectedProject?.id === project.id}
										class:bg-gray-50={selectedProject?.id !== project.id}
										class:border-gray-200={selectedProject?.id !== project.id}
										onclick={() => selectProject(project)}
										onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectProject(project); } }}
										role="button"
										tabindex="0"
									>
										<div class="flex items-start justify-between">
											<div class="flex-1 min-w-0">
												<div class="flex items-center space-x-2">
													<Icon 
														icon={project.source === 'draft' ? 'heroicons:document-duplicate' : 'heroicons:arrow-up-tray'} 
														class="w-4 h-4 text-gray-500 flex-shrink-0" 
													/>
													<h3 class="text-sm font-medium text-gray-900 truncate">{project.title}</h3>
												</div>
												<p class="text-xs text-gray-500 mt-1">{formatDate(project.lastModified)}</p>
											</div>
											<Button
												onclick={(e) => { e.stopPropagation(); deleteProject(project); }}
												variant="ghost"
												size="sm"
												iconLeft="heroicons:trash"
												class="text-red-600 hover:text-red-700"
											/>
										</div>
									</div>
								{/each}
							</div>
							
							<!-- Action buttons when projects exist -->
							<div class="border-t border-gray-200 pt-4 space-y-2">
								<Button
									onclick={() => showUploadModal = true}
									variant="secondary"
									size="sm"
									iconLeft="heroicons:arrow-up-tray"
									class="w-full"
								>
									{m.revisions_upload_button()}
								</Button>
								<Button
									onclick={() => { loadAvailableDrafts(); showImportModal = true; }}
									variant="secondary"
									size="sm"
									iconLeft="heroicons:document-duplicate"
									class="w-full"
								>
									{m.revisions_import_from_drafts()}
								</Button>
							</div>
						</div>
					{/if}
				</div>
			</Card>
		</div>

		<!-- Main Content -->
		<div class="lg:col-span-3">
			{#if selectedProject}
				<div class="space-y-6">
					<!-- Project Header -->
					<Card>
						<div class="flex items-center justify-between">
							<div>
								<h2 class="text-xl font-semibold text-gray-900">{selectedProject.title}</h2>
								<p class="text-sm text-gray-600">
									{selectedProject.source === 'draft' ? 'Imported from drafts' : 'Uploaded file'} • 
									Modified {formatDate(selectedProject.lastModified)}
								</p>
							</div>
							<div class="flex space-x-2">
								<Button
									onclick={generateAISuggestions}
									disabled={isGeneratingSuggestions || !hasValidLLMConfig}
									variant="secondary"
									iconLeft="heroicons:sparkles"
								>
									{isGeneratingSuggestions ? m.revisions_generating_suggestions() : m.revisions_ai_suggestions()}
								</Button>
								<Button
									onclick={validateContent}
									disabled={isValidating || !hasValidLLMConfig}
									variant="secondary"
									iconLeft="heroicons:globe-alt"
								>
									{isValidating ? m.revisions_browsing_web() : m.revisions_validation_results()}
								</Button>
							</div>
						</div>
					</Card>

					<!-- AI Suggestions Panel -->
					{#if selectedProject.aiSuggestions && selectedProject.aiSuggestions.length > 0}
						<Card>
							<h3 class="text-lg font-semibold text-gray-900 mb-4">{m.revisions_suggestions_title()}</h3>
							<div class="space-y-4">
								{#each selectedProject.aiSuggestions as suggestion (suggestion.id)}
									<div class="p-4 border border-gray-200 rounded-lg">
										<div class="flex items-start justify-between">
											<div class="flex-1">
												<h4 class="font-medium text-gray-900">{suggestion.title}</h4>
												<p class="text-sm text-gray-600 mt-1">{suggestion.description}</p>
												<div class="mt-3 p-3 bg-gray-50 rounded text-sm prose prose-sm max-w-none">
													{@html marked(suggestion.suggestion)}
												</div>
											</div>
											<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
												{suggestion.type}
											</span>
										</div>
									</div>
								{/each}
							</div>
						</Card>
					{/if}

					<!-- Content Editor -->
					<Card>
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Content Editor with Annotations</h3>
						<EnhancedTiptapEditor
							content={editorContent}
							onUpdate={(content) => updateContent(content)}
						/>
					</Card>
				</div>
			{:else}
				<Card>
					<div class="text-center py-12">
						<Icon icon="heroicons:document-text" class="w-16 h-16 mx-auto mb-4 text-gray-400" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">No revision selected</h3>
						<p class="text-gray-600 mb-6">Select a revision from the sidebar or create a new one to get started</p>
						<div class="flex justify-center space-x-4">
							<Button
								onclick={() => showUploadModal = true}
								variant="primary"
								iconLeft="heroicons:arrow-up-tray"
							>
								{m.revisions_upload_button()}
							</Button>
							<Button
								onclick={() => { loadAvailableDrafts(); showImportModal = true; }}
								variant="secondary"
								iconLeft="heroicons:document-duplicate"
							>
								{m.revisions_import_from_drafts()}
							</Button>
						</div>
					</div>
				</Card>
			{/if}
		</div>
	</div>
</div>

<!-- Upload Modal -->
<Modal 
	show={showUploadModal} 
	title={m.revisions_upload_title()}
	onClose={() => showUploadModal = false}
	size="md"
>
	{#snippet children()}
		<p class="text-sm text-gray-600 mb-4">{m.revisions_upload_description()}</p>
		
		<!-- Confidentiality Warning -->
		{#if hasValidLLMConfig && llmClient}
			<div class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
				<div class="flex items-start">
					<Icon icon="heroicons:exclamation-triangle" class="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
					<div class="flex-1">
						<h3 class="text-sm font-medium text-amber-800 mb-1">
							{m.revisions_confidentiality_warning_title()}
						</h3>
						<p class="text-sm text-amber-700">
							{m.revisions_confidentiality_warning()}
						</p>
					</div>
				</div>
			</div>
		{/if}
		
		<!-- File Drop Zone -->
		<FileDrop
			acceptedTypes={['.md', '.txt', '.docx']}
			onFileSelect={handleFileUpload}
			title={m.revisions_upload_title()}
			description={m.revisions_drop_description()}
			buttonText={m.revisions_choose_file()}
			formatText={m.revisions_upload_formats()}
		/>
		
		<div class="flex justify-end space-x-3 mt-6">
			<Button onclick={() => showUploadModal = false} variant="secondary">Cancel</Button>
		</div>
	{/snippet}
</Modal>

<!-- Import Modal -->
<Modal 
	show={showImportModal} 
	title={m.revisions_import_from_drafts()}
	onClose={() => showImportModal = false}
	size="lg"
>
	{#snippet children()}
		<div class="max-h-96 overflow-y-auto">
			{#if availableDrafts.length === 0}
				<div class="text-center py-8">
					<Icon icon="heroicons:document-text" class="w-12 h-12 mx-auto mb-4 text-gray-400" />
					<p class="text-sm text-gray-600">No completed drafts available to import</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each availableDrafts as draft (draft.id)}
						{@const alreadyImported = isDraftAlreadyImported(draft.id)}
						<div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
							 class:bg-blue-50={alreadyImported}
							 class:border-blue-200={alreadyImported}>
							<div>
								<h4 class="font-medium text-gray-900">{draft.projectTitle}</h4>
								<div class="flex items-center space-x-2">
									<p class="text-sm text-gray-600">{formatDate(draft.lastModified)}</p>
									{#if alreadyImported}
										<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
											<Icon icon="heroicons:check-circle" class="w-3 h-3 mr-1" />
											{m.revisions_already_imported()}
										</span>
									{/if}
								</div>
							</div>
							<Button
								onclick={() => handleDraftAction(draft)}
								variant={alreadyImported ? "secondary" : "primary"}
								size="sm"
							>
								{alreadyImported ? m.revisions_open() : m.revisions_import()}
							</Button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
		
		<div class="flex justify-end space-x-3 mt-6">
			<Button onclick={() => showImportModal = false} variant="secondary">Cancel</Button>
		</div>
	{/snippet}
</Modal>