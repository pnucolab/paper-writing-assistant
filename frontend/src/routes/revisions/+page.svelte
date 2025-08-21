<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Card from '$lib/components/ui/Card.svelte';
	import Heading from '$lib/components/ui/Heading.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '@iconify/svelte';
	import TiptapEditor from '$lib/components/ui/TiptapEditor.svelte';
	import MarkdownRenderer from '$lib/components/ui/MarkdownRenderer.svelte';
	import { marked } from 'marked';
	import type { Citation } from '$lib/stores/drafts.js';

	// i18n
	import { m } from '$lib/paraglide/messages.js';
	
	// OpenRouter integration
	import { LLMClient, getLLMSettings, type LLMConfig } from '$lib/utils/llm';

	interface Draft {
		id: string;
		projectTitle: string;
		currentStep: string;
		createdAt: string;
		lastModified: string;
		// Extended data loaded from step-specific storage
		title?: string;
		content?: string;
		paperType?: string;
		targetLength?: number;
		citations?: Citation[];
		researchFocus?: string;
		paperOutline?: Array<{title: string; bulletPoints: string[]; citationIndices: number[]}>;
	}

	interface ChatMessage {
		id: string;
		role: 'user' | 'assistant' | 'system';
		content: string;
		timestamp: string;
		metadata?: {
			promptType?: string;
			section?: string;
			wordCount?: number;
			settings?: any;
		};
	}

	let drafts = $state<Draft[]>([]);
	let selectedDraft = $state<Draft | null>(null);
	let editorContent = $state('');
	let chatMessages = $state<ChatMessage[]>([]);
	let newMessage = $state('');
	let isSaving = $state(false);
	let isSendingMessage = $state(false);
	
	// Editor reference
	let tiptapEditor = $state<any>(null);
	
	// LLM client
	let llmSettings = $state<LLMConfig | null>(null);
	let llmClient: LLMClient | null = null;
	let llmConfigError = $state<string | null>(null);

	function loadDrafts() {
		try {
			const saved = localStorage.getItem('paperwriter-drafts');
			if (saved) {
				const baseDrafts = JSON.parse(saved);
				drafts = baseDrafts.map((draft: any) => {
					// Load extended data from step-specific storage
					const extendedDraft: Draft = {
						...draft,
						id: draft.id || `draft-${Date.now()}`
					};

					// Load format data
					try {
						const formatData = localStorage.getItem(`paperwriter-draft-${draft.id}-format`);
						if (formatData) {
							const format = JSON.parse(formatData);
							extendedDraft.paperType = format.paperType;
							extendedDraft.targetLength = format.targetLength;
						}
					} catch (error) {
						console.error(`Failed to load format data for ${draft.id}:`, error);
					}

					// Load outline data (contains manuscript title)
					try {
						const outlineData = localStorage.getItem(`paperwriter-draft-${draft.id}-outline`);
						if (outlineData) {
							const outline = JSON.parse(outlineData);
							extendedDraft.title = outline.title;
							extendedDraft.paperOutline = outline.paperOutline;
						}
					} catch (error) {
						console.error(`Failed to load outline data for ${draft.id}:`, error);
					}

					// Load documents data (contains citations)
					try {
						const documentsData = localStorage.getItem(`paperwriter-draft-${draft.id}-documents`);
						if (documentsData) {
							const documents = JSON.parse(documentsData);
							extendedDraft.citations = documents.citations || [];
						}
					} catch (error) {
						console.error(`Failed to load documents data for ${draft.id}:`, error);
					}

					// Load focus data
					try {
						const focusData = localStorage.getItem(`paperwriter-draft-${draft.id}-focus`);
						if (focusData) {
							const focus = JSON.parse(focusData);
							extendedDraft.researchFocus = focus.researchFocus;
						}
					} catch (error) {
						console.error(`Failed to load focus data for ${draft.id}:`, error);
					}

					// Load writing data (contains paper content)
					try {
						const writingData = localStorage.getItem(`paperwriter-draft-${draft.id}-writing`);
						if (writingData) {
							const writing = JSON.parse(writingData);
							extendedDraft.content = writing.content || writing.paperContent || '';
						}
					} catch (error) {
						console.error(`Failed to load writing data for ${draft.id}:`, error);
					}

					// Set fallback content if no writing data available
					if (!extendedDraft.content) {
						extendedDraft.content = extendedDraft.title ? `# ${extendedDraft.title}\n\n[Paper content not yet available - complete the writing step]` : '[No content available]';
					}

					return extendedDraft;
				});
			}
		} catch (error) {
			console.error('Failed to load drafts:', error);
		}
	}

	function selectDraft(draft: Draft) {
		selectedDraft = draft;
		// Convert markdown to HTML for Tiptap
		editorContent = marked(draft.content || '') as string;
		
		// Initialize chat with paper creation context
		initializeChatSession(draft);
	}

	function initializeChatSession(draft: Draft) {
		const timestamp = Date.now();
		
		// Load chat history from localStorage first
		const chatHistory = localStorage.getItem(`paperwriter-chat-${draft.id}`);
		let savedMessages: ChatMessage[] = [];
		
		if (chatHistory) {
			try {
				savedMessages = JSON.parse(chatHistory);
			} catch (error) {
				console.error('Failed to load chat history:', error);
			}
		}
		
		// Check if we already have initialization messages in history
		const hasInitMessage = savedMessages.some(msg => msg.id.startsWith('system-init-'));
		const hasWelcomeMessage = savedMessages.some(msg => msg.id.startsWith('assistant-welcome-'));
		
		// Only add initialization messages if they don't already exist
		const initMessages: ChatMessage[] = [];
		
		if (!hasInitMessage) {
			initMessages.push({
				id: `system-init-${draft.id}-${timestamp}`,
				role: 'system',
				content: m.drafts_session_initialized({ title: draft.title || draft.projectTitle }),
				timestamp: draft.createdAt,
				metadata: {
					promptType: 'initialization',
					settings: {
						paperType: draft.paperType || 'Unknown',
						targetLength: draft.targetLength || 0,
						citationCount: draft.citations?.length || 0
					}
				}
			});
		}
		
		if (!hasWelcomeMessage) {
			initMessages.push({
				id: `assistant-welcome-${draft.id}-${timestamp}`,
				role: 'assistant',
				content: m.drafts_assistant_welcome({ 
					paperType: draft.paperType || 'research paper', 
					title: draft.title || draft.projectTitle, 
					wordCount: draft.targetLength || 0, 
					citationCount: draft.citations?.length || 0 
				}),
				timestamp: draft.createdAt
			});
		}
		
		// Combine initialization messages with saved messages
		chatMessages = [...initMessages, ...savedMessages];
	}

	function deleteDraft(draft: Draft) {
		const displayTitle = draft.title || draft.projectTitle;
		if (confirm(m.drafts_delete_confirm({ title: displayTitle }))) {
			drafts = drafts.filter(d => d.id !== draft.id);
			
			// Update main drafts list
			const baseDrafts = drafts.map(d => ({
				id: d.id,
				projectTitle: d.projectTitle,
				currentStep: d.currentStep,
				createdAt: d.createdAt,
				lastModified: d.lastModified
			}));
			localStorage.setItem('paperwriter-drafts', JSON.stringify(baseDrafts));
			
			// Clean up all step-specific data
			try {
				localStorage.removeItem(`paperwriter-draft-${draft.id}-format`);
				localStorage.removeItem(`paperwriter-draft-${draft.id}-documents`);
				localStorage.removeItem(`paperwriter-draft-${draft.id}-focus`);
				localStorage.removeItem(`paperwriter-draft-${draft.id}-outline`);
				localStorage.removeItem(`paperwriter-draft-${draft.id}-writing`);
				localStorage.removeItem(`paperwriter-chat-${draft.id}`);
			} catch (error) {
				console.error('Failed to cleanup draft data:', error);
			}
			
			if (selectedDraft?.id === draft.id) {
				selectedDraft = null;
				chatMessages = [];
			}
		}
	}


	async function saveDraft() {
		if (!selectedDraft) return;
		
		isSaving = true;
		try {
			// Get content from editor or fallback to editorContent
			const content = editorContent;
			
			// Update draft in memory
			const updatedDraft = {
				...selectedDraft,
				content,
				lastModified: new Date().toISOString()
			};

			// Update in array
			const draftIndex = drafts.findIndex(d => d.id === selectedDraft?.id);
			if (draftIndex !== -1) {
				drafts[draftIndex] = updatedDraft;
				selectedDraft = updatedDraft;
			}

			// Save main drafts list (without extended data)
			const baseDrafts = drafts.map(d => ({
				id: d.id,
				projectTitle: d.projectTitle,
				currentStep: d.currentStep,
				createdAt: d.createdAt,
				lastModified: d.lastModified
			}));
			localStorage.setItem('paperwriter-drafts', JSON.stringify(baseDrafts));

			// Save content to writing step storage
			try {
				const existingWritingData = localStorage.getItem(`paperwriter-draft-${selectedDraft.id}-writing`);
				let writingData = {};
				
				if (existingWritingData) {
					writingData = JSON.parse(existingWritingData);
				}
				
				writingData = {
					...writingData,
					content: content,
					lastSaved: new Date().toISOString()
				};
				
				localStorage.setItem(`paperwriter-draft-${selectedDraft.id}-writing`, JSON.stringify(writingData));
			} catch (error) {
				console.error('Failed to save writing data:', error);
			}

			// Add save message to chat
			const saveMessage: ChatMessage = {
				id: `save-${selectedDraft.id}-${Date.now()}`,
				role: 'system',
				content: m.drafts_save_success(),
				timestamp: new Date().toISOString()
			};
			chatMessages = [...chatMessages, saveMessage];
			saveChatHistory();

		} catch (error) {
			console.error('Failed to save draft:', error);
			alert(m.drafts_save_failed());
		} finally {
			isSaving = false;
		}
	}

	async function sendMessage() {
		if (!newMessage.trim() || !selectedDraft || isSendingMessage) return;

		const userMessageContent = newMessage.trim();
		const timestamp = Date.now();
		
		// Add user message
		const userMessage: ChatMessage = {
			id: `msg-${selectedDraft.id}-${timestamp}`,
			role: 'user',
			content: userMessageContent,
			timestamp: new Date().toISOString()
		};

		chatMessages = [...chatMessages, userMessage];
		newMessage = '';
		isSendingMessage = true;

		try {
			// Build context about the paper
			const paperContext = `
You are helping with a ${selectedDraft.paperType || 'research'} paper titled "${selectedDraft.title || selectedDraft.projectTitle}".
Paper details:
- Type: ${selectedDraft.paperType || 'research paper'}
- Target length: ${selectedDraft.targetLength || 'unknown'} words
- Number of citations: ${selectedDraft.citations?.length || 0}
- Research focus: ${selectedDraft.researchFocus || 'Not specified'}

The paper content is:
${selectedDraft.content || '[No content available]'}

Please provide helpful assistance about this paper. Be specific and reference the actual content when relevant.
			`.trim();

			// Create system prompt with paper context
			const systemPrompt = `You are an expert academic writing assistant helping a researcher with their paper. 

${paperContext}

Provide helpful, specific advice about the paper content, structure, writing style, citations, or any other aspects the user asks about. Reference the actual paper content when relevant.`;

			const userPrompt = userMessageContent;

			// Call LLM API
			const result = await llmClient?.chatCompletion(systemPrompt, userPrompt);

			if (!result) {
				throw new Error('No response from LLM');
			}

			// Add assistant response
			const assistantMessage: ChatMessage = {
				id: `reply-${selectedDraft.id}-${timestamp + 1}`,
				role: 'assistant',
				content: result.content,
				timestamp: new Date().toISOString(),
				metadata: {
					promptType: 'paper_discussion',
					settings: {
						model: llmSettings?.modelName || 'unknown',
						temperature: 0.7
					}
				}
			};

			chatMessages = [...chatMessages, assistantMessage];
			saveChatHistory();

		} catch (error) {
			console.error('Failed to send message:', error);
			
			// Add error message to chat
			const errorMessage: ChatMessage = {
				id: `error-${selectedDraft.id}-${timestamp + 2}`,
				role: 'system',
				content: m.drafts_chat_error({ error: error instanceof Error ? error.message : m.drafts_unknown_error() }),
				timestamp: new Date().toISOString()
			};

			chatMessages = [...chatMessages, errorMessage];
			saveChatHistory();
		} finally {
			isSendingMessage = false;
		}
	}

	function saveChatHistory() {
		if (selectedDraft) {
			// Only save user and assistant messages, not system messages
			const messagesToSave = chatMessages.filter(msg => 
				msg.role !== 'system' || msg.id.startsWith('save-')
			);
			localStorage.setItem(`paperwriter-chat-${selectedDraft.id}`, JSON.stringify(messagesToSave));
		}
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

	function handleEditorUpdate(content: string) {
		editorContent = content;
	}

	onMount(() => {
		loadDrafts();
		
		// Initialize LLM client
		try {
			llmSettings = getLLMSettings();
			llmClient = new LLMClient(llmSettings);
			llmConfigError = null;
		} catch (error) {
			llmConfigError = error instanceof Error ? error.message : 'Unknown error configuring LLM';
			console.warn('LLM configuration error:', error);
		}
		
		// Check if there's a specific draft ID in the URL
		const draftId = $page.url.searchParams.get('id');
		if (draftId) {
			const draft = drafts.find(d => d.id === draftId);
			if (draft) {
				selectDraft(draft);
			}
		}
	});

</script>

<div class="max-w-7xl mx-auto px-6 py-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-semibold text-gray-900 mb-2">{m.revisions_page_title()}</h1>
		<p class="text-gray-600">{m.revisions_page_description()}</p>
	</div>

	<div class="flex gap-8">
		<!-- Left Sidebar: Drafts List and Chat -->
		<div class="w-96 flex-shrink-0 space-y-6">
			<!-- Drafts List -->
			<Card>
				{#snippet header()}
					<div class="flex items-center justify-between">
						<Heading level="h2" size="lg">{m.drafts_your_drafts()}</Heading>
					</div>
				{/snippet}

				<div class="space-y-4">
					{#if drafts.length === 0}
						<div class="text-center py-8">
							<Icon icon="heroicons:document-text" class="w-12 h-12 mx-auto mb-4 text-secondary-400" />
							<p class="text-secondary-600 mb-4">{m.drafts_no_drafts_yet()}</p>
						</div>
					{:else}
						{#each drafts as draft (draft.id)}
							<div 
								class="p-4 border border-secondary-200 rounded-lg cursor-pointer transition-all duration-200 hover:border-primary-200 hover:shadow-sm"
								class:bg-primary-50={selectedDraft?.id === draft.id}
								class:border-primary-200={selectedDraft?.id === draft.id}
								role="button"
								tabindex="0"
								onclick={() => selectDraft(draft)}
								onkeydown={(e) => e.key === 'Enter' && selectDraft(draft)}
							>
								<div class="flex items-start justify-between">
									<div class="flex-1 min-w-0">
										<h3 class="font-medium text-secondary-900 truncate">{draft.title || draft.projectTitle}</h3>
										<p class="text-sm text-secondary-600 mt-1">
											{draft.paperType || 'Unknown type'} • {(draft.targetLength || 0).toLocaleString()} words
										</p>
										<p class="text-xs text-secondary-500 mt-2">
											{formatDate(draft.lastModified)}
										</p>
									</div>
									<button
										onclick={(e) => { e.stopPropagation(); deleteDraft(draft); }}
										class="ml-2 p-1 text-secondary-400 hover:text-red-600 transition-colors duration-200"
									>
										<Icon icon="heroicons:trash" class="w-4 h-4" />
									</button>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</Card>

			<!-- Floating Chat Session -->
			<div class="sticky top-6">
				<Card>
					{#snippet header()}
						<Heading level="h2" size="lg">{m.drafts_chat_session()}</Heading>
						<p class="text-sm text-secondary-600 mt-1">
							{m.drafts_chat_description()}
						</p>
					{/snippet}

					<div class="flex flex-col h-[32rem]">
						<!-- Chat Messages -->
						<div class="flex-1 overflow-y-auto space-y-4 mb-4">
							{#each chatMessages as message (message.id)}
								<div class="flex items-start space-x-3">
									<div class="flex-shrink-0">
										{#if message.role === 'user'}
											<div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
												<Icon icon="heroicons:user" class="w-4 h-4 text-white" />
											</div>
										{:else if message.role === 'assistant'}
											<div class="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
												<Icon icon="heroicons:sparkles" class="w-4 h-4 text-white" />
											</div>
										{:else}
											<div class="w-8 h-8 bg-secondary-400 rounded-full flex items-center justify-center">
												<Icon icon="heroicons:information-circle" class="w-4 h-4 text-white" />
											</div>
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<div class="bg-secondary-50 rounded-lg p-3">
											{#if message.role === 'assistant'}
												<div class="text-sm text-secondary-900">
													<MarkdownRenderer content={message.content} />
												</div>
											{:else}
												<p class="text-sm text-secondary-900">{message.content}</p>
											{/if}
											{#if message.metadata}
												<div class="mt-2 text-xs text-secondary-500">
													{#if message.metadata.promptType}
														<span class="bg-secondary-200 px-2 py-1 rounded">
															{message.metadata.promptType}
														</span>
													{/if}
													{#if message.metadata.section}
														<span class="bg-blue-100 px-2 py-1 rounded ml-1">
															{message.metadata.section}
														</span>
													{/if}
												</div>
											{/if}
										</div>
										<p class="text-xs text-secondary-500 mt-1">
											{formatDate(message.timestamp)}
										</p>
									</div>
								</div>
							{/each}
							
							<!-- Typing indicator when sending message -->
							{#if isSendingMessage}
								<div class="flex items-start space-x-3">
									<div class="flex-shrink-0">
										<div class="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
											<Icon icon="heroicons:arrow-path" class="w-4 h-4 text-white animate-spin" />
										</div>
									</div>
									<div class="flex-1 min-w-0">
										<div class="bg-secondary-50 rounded-lg p-3">
											<p class="text-sm text-secondary-600 italic">{m.drafts_ai_thinking()}</p>
										</div>
									</div>
								</div>
							{/if}
						</div>

						<!-- Chat Input -->
						<div class="border-t border-secondary-200 pt-4">
							{#if llmConfigError}
								<div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
									<div class="flex items-center">
										<Icon icon="heroicons:exclamation-triangle" class="w-5 h-5 text-yellow-600 mr-2" />
										<div>
											<p class="text-sm font-medium text-yellow-800">{m.llm_config_warning_title()}</p>
											<p class="text-sm text-yellow-700 mt-1">{m.llm_config_warning_description()}</p>
										</div>
									</div>
								</div>
							{/if}
							<div class="flex space-x-2">
								<input
									bind:value={newMessage}
									onkeydown={(e) => e.key === 'Enter' && !isSendingMessage && !llmConfigError && sendMessage()}
									placeholder={llmConfigError ? 'Please configure API settings first' : m.drafts_chat_placeholder()}
									disabled={isSendingMessage || !!llmConfigError}
									class="flex-1 w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-secondary-50"
								/>
								<Button
									onclick={sendMessage}
									variant="primary"
									size="sm"
									class="min-w-[80px]"
									iconLeft={isSendingMessage ? "heroicons:arrow-path" : "heroicons:paper-airplane"}
									disabled={!newMessage.trim() || isSendingMessage || !!llmConfigError}
								>
									{isSendingMessage ? m.drafts_sending() : m.drafts_send()}
								</Button>
							</div>
						</div>
					</div>
				</Card>
			</div>
		</div>

		<!-- Main Content: Paper Editor -->
		<div class="flex-1">
			{#if selectedDraft}
				<Card>
					{#snippet header()}
						<div class="flex items-center justify-between">
							<div>
								{#if selectedDraft}
									<Heading level="h2" size="lg">{selectedDraft.title || selectedDraft.projectTitle}</Heading>
									<p class="text-sm text-secondary-600 mt-1">
										{m.drafts_paper_info({ paperType: selectedDraft.paperType || 'Unknown type', citationCount: selectedDraft.citations?.length || 0 })}
									</p>
								{/if}
							</div>
							<div class="flex items-center space-x-2">
								<Button
									onclick={saveDraft}
									variant="primary"
									size="sm"
									iconLeft="heroicons:check"
									disabled={isSaving}
									class="min-w-[80px]"
								>
									{isSaving ? m.drafts_saving() : m.drafts_save()}
								</Button>
							</div>
						</div>
					{/snippet}

					<div class="space-y-4">
						<!-- Tiptap Editor - Always Editing -->
						<TiptapEditor 
							content={editorContent}
							editable={true}
							onUpdate={handleEditorUpdate}
							bind:this={tiptapEditor}
						/>

						<!-- Paper Metadata -->
						<div class="pt-4 border-t border-secondary-200">
							<div class="grid grid-cols-2 gap-4 text-sm">
								{#if selectedDraft}
									<div>
										<span class="text-secondary-600">{m.drafts_created_label()}:</span>
										<span class="ml-2">{formatDate(selectedDraft.createdAt)}</span>
									</div>
									<div>
										<span class="text-secondary-600">{m.drafts_modified_label()}:</span>
										<span class="ml-2">{formatDate(selectedDraft.lastModified)}</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</Card>
			{:else}
				<!-- No Draft Selected -->
				<Card>
					<div class="text-center py-12">
						<Icon icon="heroicons:document-text" class="w-16 h-16 mx-auto mb-4 text-secondary-400" />
						<h3 class="text-lg font-medium text-secondary-900 mb-2">{m.drafts_no_draft_selected()}</h3>
						<p class="text-secondary-600 mb-6">
							{m.drafts_select_instruction()}
						</p>
						{#if drafts.length === 0}
							<Button
								href="/drafts"
								variant="primary"
								iconLeft="heroicons:plus"
							>
								{m.drafts_create_first_paper()}
							</Button>
						{/if}
					</div>
				</Card>
			{/if}
		</div>
	</div>
</div>

