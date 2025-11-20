<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Icon from '@iconify/svelte';
	import RevisionEditor from '$lib/components/editor/RevisionEditor.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import FileDrop from '$lib/components/ui/FileDrop.svelte';
	// i18n
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { getRevisionChatbotPrompt, getAIRevisorPrompt } from '$lib/utils/promptLoader';
	import { marked } from 'marked';
	import { LLMClient, getLLMSettings } from '$lib/utils/llm';
	import { generateUUID } from '$lib/utils/uuid';
	import { performCustomRevision } from '$lib/utils/revision';
    import type { Content } from '@tiptap/core';

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
		aiProcessed?: boolean; // Whether automatic AI processing has been completed
		chatHistory?: Array<{role: 'user' | 'assistant', message: string}>; // Store chat history per project
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
	let showHelpMessage = $state(false);
	let isInitialLoading = $state(true); // Loading state for initial page load

	// Chatbot state
	let showChatbotModal = $state(false);
	let chatMessage = $state('');
	let chatHistory = $state<Array<{role: 'user' | 'assistant', message: string}>>([
		{ role: 'assistant', message: m.chatbot_welcome() }
	]);
	let isSendingMessage = $state(false);

	// File upload (handled by FileDrop component)


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
				alert(m.revisions_docx_coming_soon());
				return;
			}

			const newProject: RevisionProject = {
				id: generateUUID(),
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
				alert(m.revisions_no_content_in_draft());
				return null;
			}

			const newProject: RevisionProject = {
				id: generateUUID(),
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
			alert(m.revisions_import_draft_failed());
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
		// Batch state updates to minimize re-renders
		selectedProject = project;
		editorContent = project.content;

		// Load chat history for this project
		loadChatHistoryForProject(project);

		// Update URL hash for bookmarking/sharing (defer to next tick)
		if (browser) {
			queueMicrotask(() => {
				window.location.hash = project.id;
			});
		}
	}

	// Update content
	function updateContent(newContent: Content) {
		if (!selectedProject) return;
		if (typeof newContent !== 'string') {
			console.warn('Received non-string content from editor');
			return;
		}

		// Only update if content actually changed to prevent reactive loops
		if (selectedProject.content !== newContent) {
			selectedProject.content = newContent;
			selectedProject.lastModified = new Date().toISOString();
			editorContent = newContent;
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

	// Download as Markdown
	function downloadAsMarkdown(project: RevisionProject | null) {
		if (!project) return;

		const blob = new Blob([project.content], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${project.title}.md`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Download as DOCX using proper DOCX generation
	async function downloadAsDocx(project: RevisionProject | null) {
		if (!project) return;

		try {
			const { downloadDocxFile } = await import('$lib/utils/downloads');
			await downloadDocxFile(project.content, project.title);
		} catch (error) {
			console.error('Failed to download DOCX:', error);
			alert(m.revisions_docx_generation_failed());
		}
	}

	// Handle URL query parameters and hash for automatic project creation/opening
	async function handleUrlQuery() {
		if (!browser) {
			isInitialLoading = false;
			return;
		}

		const urlParams = new URLSearchParams(window.location.search);
		const draftId = urlParams.get('id'); // Unified parameter for draft import
		const projectId = window.location.hash.slice(1); // Hash for project opening

		if (draftId) {
			// Try to import from draft
			await handleDraftImportFromUrl(draftId);
		} else if (projectId) {
			// Try to open existing project
			handleProjectOpenFromUrl(projectId);
		}

		// Loading complete
		isInitialLoading = false;
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

	// Help message functions
	function dismissHelpMessage() {
		showHelpMessage = false;
		localStorage.setItem('revisions-help-dismissed', 'true');
	}

	// Chatbot functions
	function openChatbotModal() {
		showChatbotModal = true;
	}

	function closeChatbotModal() {
		showChatbotModal = false;
	}

	async function sendChatMessage() {
		if (!chatMessage.trim() || !selectedProject || isSendingMessage) return;

		const userMessage = chatMessage;
		chatMessage = '';
		isSendingMessage = true;

		// Add user message
		chatHistory = [...chatHistory, { role: 'user', message: userMessage }];
		saveChatHistoryForProject();
		
		try {
			// Get LLM settings
			const llmConfig = getLLMSettings();
			const llmClient = new LLMClient(llmConfig);

			// Get revision chatbot prompt - use editorContent for current state
			const systemPrompt = await getRevisionChatbotPrompt(
				userMessage,
				selectedProject.title,
				editorContent,
				getLocale()
			);

			// Call the LLM with proper system/user prompt separation
			const response = await llmClient.chatCompletion(systemPrompt, userMessage);

			// Check if the response contains an agentic edit request
			if (response.content.includes('AGENTIC_EDIT:')) {
				await handleAgenticEdit(response.content, userMessage);
				// Don't add the system message to chat history - it's already handled
				return;
			}

			// Add assistant response (only non-system messages)
			chatHistory = [...chatHistory, { role: 'assistant', message: response.content }];
			saveChatHistoryForProject();

		} catch (error) {
			console.error('Error sending message to LLM:', error);

			// Add error message
			const errorMessage = error instanceof Error && error.message.includes('Settings')
				? error.message
				: 'I encountered an error while processing your request. Please check your LLM settings in the Settings page.';

			chatHistory = [...chatHistory, { role: 'assistant', message: errorMessage }];
			saveChatHistoryForProject();
		} finally {
			isSendingMessage = false;
		}
	}

	function handleChatKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendChatMessage();
		}
	}

	// Handle agentic edits using proper revision workflow
	async function handleAgenticEdit(responseContent: string, originalUserMessage: string) {
		try {
			if (!selectedProject) return;

			// Parse the agentic edit request
			const editMatch = responseContent.match(/AGENTIC_EDIT:\s*(.*?)\s*\|\s*INSTRUCTION:\s*(.*?)(?=\n|$)/s);

			if (!editMatch) {
				const failureMessage = `⚠️ Could not parse the edit request. Please try rephrasing your request.`;
				chatHistory = [...chatHistory, { role: 'assistant', message: failureMessage }];
				saveChatHistoryForProject();
				return;
			}

			const textToRevise = editMatch[1].trim();
			const revisionInstruction = editMatch[2].trim();

			// Check if the text exists in the document - use editorContent
			if (!editorContent.includes(textToRevise)) {
				const failureMessage = `⚠️ Could not find the specified text in the document. The text may have been paraphrased by the AI. Please try being more specific or copy the exact text you want to edit.`;
				chatHistory = [...chatHistory, { role: 'assistant', message: failureMessage }];
				saveChatHistoryForProject();
				return;
			}

			// Use performCustomRevision with the proper revision workflow - use editorContent
			const revisionResult = await performCustomRevision(
				textToRevise,
				revisionInstruction,
				editorContent
			);

			// Apply the revision to the document - update both editorContent and selectedProject
			const updatedContent = editorContent.replace(textToRevise, revisionResult.revisedText);
			editorContent = updatedContent;
			selectedProject.content = updatedContent;
			selectedProject.lastModified = new Date().toISOString();
			saveRevisionProjects();

			// Generate a conversational follow-up response from the LLM
			const llmConfig = getLLMSettings();
			const llmClient = new LLMClient(llmConfig);

			// Use the revision chatbot prompt again for the follow-up to ensure language consistency
			const followUpSystemPrompt = await getRevisionChatbotPrompt(
				`[SYSTEM: The revision has been successfully applied. Now provide a brief, conversational response (1-2 sentences) that summarizes what was changed, without showing the before/after text.]`,
				selectedProject.title,
				editorContent,
				getLocale()
			);

			const followUpResponse = await llmClient.chatCompletion(
				followUpSystemPrompt,
				`I asked you to: "${originalUserMessage}". You applied this revision: ${revisionInstruction}. Please acknowledge this briefly and naturally.`
			);

			chatHistory = [...chatHistory, { role: 'assistant', message: followUpResponse.content }];
			saveChatHistoryForProject();

		} catch (error) {
			console.error('Error applying agentic edit:', error);
			const errorMessage = `❌ Error applying revision: ${error instanceof Error ? error.message : 'Unknown error'}`;
			chatHistory = [...chatHistory, { role: 'assistant', message: errorMessage }];
			saveChatHistoryForProject();
		}
	}

	// Load chat history for selected project
	function loadChatHistoryForProject(project: RevisionProject) {
		if (project.chatHistory && project.chatHistory.length > 0) {
			// Load existing chat history
			chatHistory = project.chatHistory;
		} else {
			// Initialize with welcome message
			chatHistory = [
				{ role: 'assistant', message: m.chatbot_welcome() }
			];
			// Save initial state
			saveChatHistoryForProject();
		}
	}

	// Save current chat history to selected project
	function saveChatHistoryForProject() {
		if (!selectedProject) return;

		selectedProject.chatHistory = chatHistory;
		saveRevisionProjects();
	}

	// Clear chat history for selected project
	function clearChatHistory() {
		if (!selectedProject) return;

		chatHistory = [
			{ role: 'assistant', message: m.chatbot_welcome() }
		];
		saveChatHistoryForProject();
	}

	// Initialize on mount
	onMount(async () => {
		// Check help message first (no DOM operations)
		const hasSeenHelp = localStorage.getItem('revisions-help-dismissed');
		if (!hasSeenHelp) {
			showHelpMessage = true;
		}

		// Load data synchronously
		loadRevisionProjects();
		loadAvailableDrafts();

		// Handle URL query and wait for completion before showing page
		await handleUrlQuery();
	});
</script>

{#if isInitialLoading}
	<!-- Full page loading spinner -->
	<div class="flex items-center justify-center min-h-screen bg-gray-50">
		<Spinner size="xl" class="text-gray-400" />
	</div>
{:else}
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
						<h2 class="text-lg font-semibold text-gray-900">{m.revisions_sidebar_title()}</h2>
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

			<!-- AI Assistant Chatbot -->
			<Card class="mt-6 sticky top-4 {!selectedProject ? 'opacity-50' : ''}">
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-semibold text-gray-900">{m.chatbot_title()}</h2>
						<div class="flex items-center gap-1">
							<button
								onclick={clearChatHistory}
								disabled={!selectedProject}
								class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
								title={m.chatbot_clear()}
							>
								<Icon icon="heroicons:trash" class="w-4 h-4" />
							</button>
							<button
								onclick={openChatbotModal}
								disabled={!selectedProject}
								class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
								title={m.chatbot_maximize()}
							>
								<Icon icon="heroicons:arrows-pointing-out" class="w-4 h-4" />
							</button>
						</div>
					</div>

					<!-- Chat Messages -->
					<div class="h-32 overflow-y-auto space-y-2 p-3 bg-gray-50 rounded-lg">
						{#each chatHistory.slice(-3) as message, index (index)}
							<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
								<div class="max-w-xs px-2 py-1 rounded text-xs {
									message.role === 'user' 
										? 'bg-primary-600 text-white' 
										: 'bg-white text-gray-800 border border-gray-200'
								}">
									{#if message.role === 'assistant'}
										{@html marked(message.message)}
									{:else}
										{message.message}
									{/if}
								</div>
							</div>
						{/each}
					</div>

					<!-- Input -->
					<div class="flex space-x-2">
						<input
							bind:value={chatMessage}
							onkeydown={handleChatKeydown}
							placeholder={selectedProject ? m.chatbot_placeholder() : m.chatbot_no_project_selected()}
							disabled={!selectedProject || isSendingMessage}
							class="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
						/>
						<button
							onclick={sendChatMessage}
							disabled={!chatMessage.trim() || !selectedProject || isSendingMessage}
							class="px-2 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
						>
							{#if isSendingMessage}
								<Icon icon="heroicons:arrow-path" class="w-3 h-3 animate-spin" />
							{:else}
								{m.chatbot_send()}
							{/if}
						</button>
					</div>
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
									{selectedProject.source === 'draft' ? m.revisions_source_draft() : m.revisions_source_upload()} • 
									{m.revisions_modified()} {formatDate(selectedProject.lastModified)}
								</p>
							</div>
							<div class="flex space-x-2">
								<Button
									onclick={() => downloadAsMarkdown(selectedProject)}
									variant="secondary"
									iconLeft="heroicons:document-text"
								>
									{m.revisions_download_md()}
								</Button>
								<Button
									onclick={() => downloadAsDocx(selectedProject)}
									variant="secondary"
									iconLeft="heroicons:document-arrow-down"
								>
									{m.revisions_download_docx()}
								</Button>
							</div>
						</div>
					</Card>

					<!-- Help Message for First-Time Visitors -->
					{#if showHelpMessage}
						<div class="bg-green-50 border border-green-200 rounded-lg p-4">
							<div class="flex">
								<div class="flex-shrink-0">
									<Icon icon="heroicons:information-circle" class="h-5 w-5 text-green-400" />
								</div>
								<div class="ml-3 flex-1">
									<h3 class="text-sm font-medium text-green-800">
										{m.revisions_help_title()}
									</h3>
									<div class="mt-2 text-sm text-green-700">
										<p>
											{m.revisions_help_intro()}
										</p>
										<ul class="mt-2 list-disc list-inside space-y-1">
											<li><strong>{m.revisions_help_ai_revise()}</strong> {m.revisions_help_ai_revise_desc()}</li>
											<li><strong>{m.revisions_help_ai_fact_check()}</strong> {m.revisions_help_ai_fact_check_desc()}</li>
										</ul>
										<p class="mt-2">
											{m.revisions_help_usage()}
										</p>
									</div>
								</div>
								<div class="ml-auto pl-3">
									<div class="-mx-1.5 -my-1.5">
										<Button
											onclick={dismissHelpMessage}
											variant="ghost"
											size="sm"
											class="inline-flex rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
										>
											<span class="sr-only">{m.revisions_dismiss()}</span>
											<Icon icon="heroicons:x-mark" class="h-5 w-5" />
										</Button>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Content Editor -->
					<Card>
						<RevisionEditor 
							initialContent={selectedProject.content}
							onContentChange={(newContent) => updateContent(newContent)}
						/>
					</Card>
				</div>
			{:else}
				<Card>
					<div class="text-center py-12">
						<Icon icon="heroicons:document-text" class="w-16 h-16 mx-auto mb-4 text-gray-400" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">{m.revisions_no_selected_title()}</h3>
						<p class="text-gray-600 mb-6">{m.revisions_no_selected_description()}</p>
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
	size="xl"
>
	{#snippet children()}
		<p class="text-sm text-gray-600 mb-4">{m.revisions_upload_description()}</p>
		
		<!-- Confidentiality Warning -->
		<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
			<div class="flex">
				<div class="flex-shrink-0">
					<Icon icon="heroicons:exclamation-triangle" class="h-5 w-5 text-red-400" />
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">
						{m.revisions_upload_warning_title()}
					</h3>
					<div class="mt-2 text-sm text-red-700">
						<p>
							{m.revisions_upload_warning_message()}
						</p>
					</div>
				</div>
			</div>
		</div>
		
		<!-- File Drop Zone -->
		<FileDrop
			acceptedTypes={['.md', '.txt', '.docx']}
			onFileSelect={handleFileUpload}
			title={m.revisions_upload_title()}
			description={m.revisions_drop_description()}
			formatText={m.revisions_upload_formats()}
		/>
		
		<div class="flex justify-end space-x-3 mt-6">
			<Button onclick={() => showUploadModal = false} variant="secondary">{m.revisions_cancel()}</Button>
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
					<p class="text-sm text-gray-600">{m.revisions_no_drafts_available()}</p>
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
			<Button onclick={() => showImportModal = false} variant="secondary">{m.revisions_cancel()}</Button>
		</div>
	{/snippet}
</Modal>

<!-- AI Assistant Modal -->
<Modal 
	show={showChatbotModal} 
	title={m.chatbot_modal_title()}
	onClose={closeChatbotModal}
	size="4xl"
>
	{#snippet children()}
		{#if selectedProject}
			<div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
				<div class="flex items-center space-x-2">
					<Icon icon="heroicons:document-text" class="w-4 h-4 text-blue-600" />
					<span class="text-sm text-blue-800">Analyzing: <strong>{selectedProject.title}</strong></span>
					<span class="text-xs text-blue-600">({Math.round(selectedProject.content.length/1000)}k characters)</span>
				</div>
			</div>

			<!-- Chat Messages -->
			<div class="h-96 overflow-y-auto space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4">
				{#each chatHistory as message, index (index)}
					<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
						<div class="max-w-2xl px-4 py-2 rounded-lg text-sm {
							message.role === 'user' 
								? 'bg-primary-600 text-white' 
								: 'bg-white text-gray-800 border border-gray-200 shadow-sm'
						}">
							{#if message.role === 'assistant'}
								{@html marked(message.message)}
							{:else}
								{message.message}
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- Input -->
			<div class="flex space-x-3">
				<input
					bind:value={chatMessage}
					onkeydown={handleChatKeydown}
					placeholder={m.chatbot_placeholder()}
					disabled={isSendingMessage}
					class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
				/>
				<button
					onclick={sendChatMessage}
					disabled={!chatMessage.trim() || isSendingMessage}
					class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
				>
					{#if isSendingMessage}
						<Icon icon="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
						<span>Sending...</span>
					{:else}
						{m.chatbot_send()}
					{/if}
				</button>
			</div>
		{:else}
			<div class="text-center py-12">
				<Icon icon="heroicons:exclamation-triangle" class="w-12 h-12 mx-auto mb-4 text-gray-400" />
				<p class="text-gray-600">{m.chatbot_no_project_selected()}</p>
			</div>
		{/if}
	{/snippet}
</Modal>
{/if}