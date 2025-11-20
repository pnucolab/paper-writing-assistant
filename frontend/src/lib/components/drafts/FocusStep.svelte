<script lang="ts">
    import { onMount } from 'svelte';
    import TextArea from '$lib/components/ui/TextArea.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Heading from '$lib/components/ui/Heading.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Label from '$lib/components/ui/Label.svelte';
	import Icon from '@iconify/svelte';
	import MarkdownRenderer from '$lib/components/ui/MarkdownRenderer.svelte';
	import type { Citation, CitationContext } from '$lib/stores/drafts';
	import type { LLMClient } from '$lib/utils/llm';
	import { getFocusStepPrompt, getFocusGenerationPrompt } from '$lib/utils/promptLoader';
	
	// i18n
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';

	// Props
	let { 
		draftId,
		llmClient,
		llmConfigError,
		onNextStep,
		onPreviousStep
	}: { 
		draftId: string;
		llmClient: LLMClient | null;
		llmConfigError: string | null;
		onNextStep: () => void;
		onPreviousStep: () => void;
	} = $props();

	// Local state for citations loaded from localStorage
	let citations = $state<Citation[]>([]);

	// Load paper format from previous step
	let paperFormat = $state<{paperType: string, targetLength: number, targetLanguage: string}>({paperType: 'research', targetLength: 5000, targetLanguage: 'English'});

	// File summaries from documents step
	let figureFiles = $state<{ name: string; summary?: string }[]>([]);
	let supplementaryFiles = $state<{ name: string; summary?: string }[]>([]);

	// Research focus data
	let researchFocus = $state('');
	
	// LLM client is passed as prop
	
	// Chatbot data
	let chatMessages = $state<Array<{role: 'user' | 'assistant', content: string, timestamp: string, error?: boolean}>>([]);
	let currentMessage = $state('');
	let isGeneratingResponse = $state(false);
	let streamingMessageContent = $state('');
	let isStreamingMessage = $state(false);
	let isGeneratingFocus = $state(false);

	// Localized research prompts using i18n
	let researchPrompts = $derived(() => ({
		research: {
			agenda: m.focus_prompts_research_agenda(),
			gap: m.focus_prompts_research_gap()
		},
		review: {
			agenda: m.focus_prompts_review_agenda(),
			gap: m.focus_prompts_review_gap()
		},
		perspective: {
			agenda: m.focus_prompts_perspective_agenda(),
			gap: m.focus_prompts_perspective_gap()
		},
		protocol: {
			agenda: m.focus_prompts_protocol_agenda(),
			gap: m.focus_prompts_protocol_gap()
		},
		reply: {
			agenda: m.focus_prompts_reply_agenda(),
			gap: m.focus_prompts_reply_gap()
		},
		letter: {
			agenda: m.focus_prompts_letter_agenda(),
			gap: m.focus_prompts_letter_gap()
		}
	}));

	// Validation
	let canProceedToNextStep = $derived(() => {
		return researchFocus.trim().length > 0;
	});

	function saveFocusData() {
		try {
			const focusData = {
				researchFocus,
				chatMessages,
				lastSaved: new Date().toISOString()
			};
			localStorage.setItem(`paperwriter-draft-${draftId}-focus`, JSON.stringify(focusData));
		} catch (error) {
			console.error('Failed to save focus data:', error);
		}
	}


	// Simulate typing effect for displaying text character by character
	async function typewriterEffect(text: string, callback: (char: string) => void) {
		const words = text.split(' ');
		for (let i = 0; i < words.length; i++) {
			callback(words[i]);
			// Add random delay to simulate natural typing
			const delay = Math.random() * 30;
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}



	// Send message to AI chatbot
	async function sendChatMessage() {
		if (!currentMessage.trim() || !llmClient || llmConfigError) return;
		
		const userMessage = currentMessage.trim();
		currentMessage = '';
		isGeneratingResponse = true;
		streamingMessageContent = '';
		isStreamingMessage = false;
		
		// Add user message
		chatMessages = [...chatMessages, {
			role: 'user',
			content: userMessage,
			timestamp: new Date().toISOString()
		}];
		
		try {

			// Build system prompt based on paper type and context
			const paperType = paperFormat.paperType as keyof ReturnType<typeof researchPrompts>;
			const prompts = researchPrompts()[paperType];
			
			// Build citations context for the prompt function
			const citationsContext: CitationContext[] = citations.map(citation => ({
				id: citation.id,
				title: citation.title,
				authors: citation.authors.join(', '),
				year: citation.year,
				abstract: citation.abstract || 'No abstract available'
			}));
			
			// Get system prompt (now async from markdown template)
			const systemPrompt = await getFocusStepPrompt(
				paperType,
				researchFocus,
				citationsContext,
				prompts?.agenda,
				prompts?.gap,
				figureFiles,
				supplementaryFiles
			);

			// Build conversation context for streaming
			const conversationHistory = chatMessages.filter(m => !m.error).map(m => m.content).join('\n\n');
			const fullUserPrompt = conversationHistory ? `${conversationHistory}\n\nUser: ${userMessage}` : userMessage;

			isStreamingMessage = true;
			streamingMessageContent = '';

			// Use the streaming method from LLM client
			const assistantMessage = await llmClient.chatCompletionStream(
				systemPrompt,
				fullUserPrompt,
				(chunk: string) => {
					streamingMessageContent += chunk;
				}
			);

			isStreamingMessage = false;
			
			// Add the complete assistant message
			chatMessages = [...chatMessages, {
				role: 'assistant',
				content: assistantMessage,
				timestamp: new Date().toISOString()
			}];

			isGeneratingResponse = false;
			saveFocusData();

		} catch (error) {
			console.error('Failed to send chat message:', error);
			isGeneratingResponse = false;
			isStreamingMessage = false;
			
			// Add error message to chat
			chatMessages = [...chatMessages, {
				role: 'assistant',
				content: `Error: ${error instanceof Error ? error.message : m.focus_ai_error()}`,
				timestamp: new Date().toISOString(),
				error: true
			}];
			saveFocusData();
		}
	}
	
	// Start guided research focus session
	async function startGuidedSession() {
		if (chatMessages.length === 0) {
			const paperType = paperFormat.paperType as keyof ReturnType<typeof researchPrompts>;
			const prompts = researchPrompts()[paperType];
			
			// Create localized welcome message
			const agenda = prompts?.agenda || m.focus_prompts_research_agenda();
			let welcomeMessage: string;
			
			// Count available resources
			const hasCitations = citations && citations.length > 0;
			const hasFigures = figureFiles && figureFiles.length > 0;
			const hasSupplementary = supplementaryFiles && supplementaryFiles.length > 0;
			
			// Build resource list
			let resourceList: string[] = [];
			if (hasCitations) {
				resourceList.push(`${citations.length} citation${citations.length === 1 ? '' : 's'}`);
			}
			if (hasFigures) {
				resourceList.push(`${figureFiles.length} figure${figureFiles.length === 1 ? '' : 's'}`);
			}
			if (hasSupplementary) {
				resourceList.push(`${supplementaryFiles.length} supplementary file${supplementaryFiles.length === 1 ? '' : 's'}`);
			}
			
			if (resourceList.length > 0) {
				const resourceString = resourceList.length === 1 
					? resourceList[0]
					: resourceList.slice(0, -1).join(', ') + ' and ' + resourceList[resourceList.length - 1];
				
				welcomeMessage = m.focus_ai_welcome_with_resources({
					paperType,
					agenda,
					resources: resourceString
				});
			} else {
				welcomeMessage = m.focus_ai_welcome_base({
					paperType,
					agenda
				});
			}
			
			// Start streaming the initial message
			isStreamingMessage = true;
			streamingMessageContent = '';
			
			// Use typewriter effect for the welcome message
			await typewriterEffect(welcomeMessage, (word) => {
				streamingMessageContent += word + ' ';
			});
			
			// Add the complete message to chat history
			chatMessages = [{
				role: 'assistant',
				content: welcomeMessage,
				timestamp: new Date().toISOString()
			}];
			
			isStreamingMessage = false;
			saveFocusData();
		}
	}

	// Clear chat history
	function clearChatHistory() {
		if (confirm(m.focus_clear_confirm())) {
			chatMessages = [];
			streamingMessageContent = '';
			isStreamingMessage = false;
			isGeneratingResponse = false;
			saveFocusData();
		}
	}

	// Copy message content to clipboard
	async function copyToClipboard(content: string) {
		try {
			await navigator.clipboard.writeText(content);
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
		}
	}

	// Generate research focus based on entire chat history
	async function generateResearchFocus() {
		if (!llmClient || llmConfigError || chatMessages.length === 0) return;
		
		// Show confirmation if there's existing research focus
		if (researchFocus.trim() && !confirm(m.focus_generate_confirm())) {
			return;
		}
		
		isGeneratingFocus = true;
		researchFocus = ''; // Clear current content to show streaming
		
		try {
			// Build the conversation history
			const conversationHistory = chatMessages
				.filter(m => !m.error)
				.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
				.join('\n\n');
			
			// Get the focus generation prompt (now async from markdown template)
			const systemPrompt = await getFocusGenerationPrompt(
				paperFormat.paperType,
				paperFormat.targetLength,
				citations.length,
				getLocale(),
				figureFiles,
				supplementaryFiles
			);

			const userPrompt = `Based on this research conversation, generate a comprehensive research focus statement:

${conversationHistory}`;

			// Generate the research focus with streaming
			const response = await llmClient.chatCompletionStream(
				systemPrompt,
				userPrompt,
				(chunk: string) => {
					// Stream chunks directly to the research focus textarea
					researchFocus += chunk;
				}
			);
			
			// Clean up the final response
			const cleanContent = response
				.replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
				.replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
				.replace(/`(.*?)`/g, '$1') // Remove inline code formatting
				.replace(/^#+\s/gm, '') // Remove heading markers
				.replace(/^[-*]\s/gm, '• ') // Convert list markers to bullets
				.trim();
				
			researchFocus = cleanContent;
			saveFocusData();
			
		} catch (error) {
			console.error('Failed to generate research focus:', error);
			alert(`Error generating research focus: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			isGeneratingFocus = false;
		}
	}


    function proceedToNextStep() {
		if (!canProceedToNextStep()) {
			alert(m.focus_validation_required());
			return;
		}
		saveFocusData();
		onNextStep();
	}

	function loadFocusData() {
		try {
			// Load paper format from previous step
			const savedFormat = localStorage.getItem(`paperwriter-draft-${draftId}-format`);
			if (savedFormat) {
				const format = JSON.parse(savedFormat);
				paperFormat = {
					paperType: format.paperType || 'research',
					targetLength: format.targetLength || 5000,
					targetLanguage: format.targetLanguage || 'English'
				};
			}
			
			// Load citations from documents step
			const savedDocuments = localStorage.getItem(`paperwriter-draft-${draftId}-documents`);
			if (savedDocuments) {
				const documentsData = JSON.parse(savedDocuments);
				citations = documentsData.citations || [];
				
				// Load figure files with summaries
				if (documentsData.figureFiles) {
					figureFiles = documentsData.figureFiles
						.filter((file: any) => file.summary) // Only include files with summaries
						.map((file: any) => ({
							name: file.name,
							summary: file.summary
						}));
				}
				
				// Load supplementary files with summaries
				if (documentsData.uploadedFiles) {
					supplementaryFiles = documentsData.uploadedFiles
						.filter((file: any) => file.summary) // Only include files with summaries
						.map((file: any) => ({
							name: file.name,
							summary: file.summary
						}));
				}
			}
			
			// Load focus data
			const savedFocus = localStorage.getItem(`paperwriter-draft-${draftId}-focus`);
			if (savedFocus) {
				const focusData = JSON.parse(savedFocus);
				researchFocus = focusData.researchFocus || '';
				chatMessages = focusData.chatMessages || [];
			}
		} catch (error) {
			console.error('Failed to load focus data:', error);
		}
	}
    
	// Load saved data on mount
	onMount(() => {
		loadFocusData();
	});
</script>

<!-- Research Focus Step -->
<div class="space-y-6">
    <!-- Research Focus -->
    <Card>
        {#snippet header()}
            <Heading level="h3" size="lg">{m.focus_step_title()}</Heading>
            <p class="text-secondary-600 mt-1">{m.focus_step_subtitle({ paperType: paperFormat.paperType })}</p>
        {/snippet}
        
        <div class="space-y-6">
            <!-- Research Focus Textbox -->
            <div>
                <div class="flex items-center space-x-2 mb-2">
                    <Label for="research-focus">{m.focus_research_focus_label()}</Label>
                    {#if isGeneratingFocus}
                        <div class="flex items-center space-x-2">
                            <Icon icon="heroicons:arrow-path" class="w-4 h-4 animate-spin text-primary-600" />
                            <span class="text-sm text-primary-600">{m.focus_generating_focus()}</span>
                        </div>
                    {/if}
                </div>
                <TextArea
                    id="research-focus"
                    bind:value={researchFocus}
                    placeholder={m.focus_research_focus_placeholder()}
                    rows={8}
                    onkeyup={() => saveFocusData()}
                    disabled={isGeneratingFocus}
                />
                <p class="text-sm text-secondary-500 mt-1">
                    {m.focus_research_focus_help()}
                </p>
            </div>
            
            <!-- AI Assistant Chat -->
            <div class="space-y-4">
                <!-- Chat Messages -->
                <div class="max-h-96 overflow-y-auto space-y-3 p-4 bg-secondary-50 rounded-lg border border-secondary-200">
                    {#if chatMessages.length === 0 && !isStreamingMessage}
                        <div class="text-center py-8">
                            <Icon icon="heroicons:chat-bubble-left-right" class="w-12 h-12 mx-auto mb-3 text-secondary-400" />
                            <p class="text-secondary-500 mb-4">{m.focus_ai_help_title()}</p>
                            <Button
                                onclick={startGuidedSession}
                                variant="primary"
                                iconLeft="heroicons:sparkles"
                            >
                                {m.focus_start_ai_session()}
                            </Button>
                        </div>
                    {:else}
                        {#each chatMessages as message}
                            <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
                                <div class="relative group max-w-lg px-4 py-2 rounded-lg shadow {message.role === 'user' ? 'bg-primary-600 text-white' : message.error ? 'bg-red-50 border border-red-200 text-red-900' : 'bg-white border border-secondary-200 text-secondary-900'}">
                                    {#if message.error}
                                        <div class="flex items-start space-x-2">
                                            <Icon icon="heroicons:exclamation-triangle" class="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <MarkdownRenderer content={message.content} class="text-sm" />
                                            </div>
                                        </div>
                                    {:else}
                                        <MarkdownRenderer content={message.content} class="text-sm" />
                                    {/if}
                                    
                                    <div class="flex justify-between items-end mt-1">
                                        <p class="text-xs opacity-75">
                                            {new Date(message.timestamp).toLocaleTimeString()}
                                        </p>
                                        <!-- Hover buttons for AI messages (non-error, non-user) -->
                                        {#if message.role === 'assistant' && !message.error}
                                            <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex justify-end">
                                                <button
                                                    onclick={() => copyToClipboard(message.content)}
                                                    class="p-1 bg-secondary-100 hover:bg-secondary-200 rounded border border-secondary-300 transition-colors"
                                                    title={m.focus_copy_clipboard()}
                                                >
                                                    <Icon icon="heroicons:clipboard" class="w-3 h-3 text-secondary-600" />
                                                </button>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    {/if}
                    
                    {#if isStreamingMessage}
                        <div class="flex justify-start">
                            <div class="relative group max-w-lg px-4 py-2 rounded-lg bg-white border border-secondary-200 text-secondary-900">
                                <div class="flex items-end">
                                    <MarkdownRenderer content={streamingMessageContent} class="text-sm" thinking={!streamingMessageContent.trim()} />
                                    {#if streamingMessageContent.trim()}
                                        <span class="animate-pulse ml-1">|</span>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {:else if isGeneratingResponse}
                        <div class="flex justify-start">
                            <div class="max-w-lg px-4 py-2 rounded-lg bg-white border border-secondary-200">
                                <div class="flex items-center space-x-2">
                                    <Icon icon="heroicons:arrow-path" class="w-4 h-4 animate-spin text-secondary-500" />
                                    <span class="text-sm text-secondary-500">{m.focus_ai_thinking()}</span>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
                
                <!-- Chat Input -->
                {#if llmConfigError}
                    <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div class="flex items-center">
                            <Icon icon="heroicons:exclamation-triangle" class="w-5 h-5 text-red-600 mr-2" />
                            <div>
                                <p class="text-sm font-medium text-red-800">Configuration Required</p>
                                <p class="text-sm text-red-700 mt-1">{llmConfigError}</p>
                            </div>
                        </div>
                    </div>
                {/if}
                <div class="flex space-x-3">
                    <div class="flex-1">
                        <Input
                            bind:value={currentMessage}
                            placeholder={llmConfigError ? 'Please configure API settings first' : m.focus_message_placeholder()}
                            onkeyup={(e: KeyboardEvent) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendChatMessage();
                                }
                            }}
                            disabled={isGeneratingResponse || isStreamingMessage || !!llmConfigError}
                        />
                    </div>
                    <Button
                        onclick={sendChatMessage}
                        disabled={!currentMessage.trim() || isGeneratingResponse || isStreamingMessage || !!llmConfigError}
                        variant="primary"
                        iconLeft="heroicons:paper-airplane"
                    >
                        {m.focus_send_button()}
                    </Button>
                </div>
                
                <!-- Chat Action Buttons -->
                {#if chatMessages.length > 0}
                    <div class="flex justify-center space-x-3">
                        <Button
                            onclick={generateResearchFocus}
                            disabled={isGeneratingResponse || isStreamingMessage || isGeneratingFocus || !!llmConfigError}
                            variant="secondary"
                            iconLeft="heroicons:sparkles"
                        >
                            {isGeneratingFocus ? m.focus_generating_focus() : m.focus_generate_from_chat()}
                        </Button>
                        <Button
                            onclick={clearChatHistory}
                            disabled={isGeneratingResponse || isStreamingMessage}
                            variant="secondary"
                            iconLeft="heroicons:arrow-path"
                        >
                            {m.focus_reset_chat()}
                        </Button>
                    </div>
                {/if}
                
                <!-- Quick Actions -->
                {#if chatMessages.length > 0}
                    <div class="flex flex-wrap gap-2 pt-2 border-t border-secondary-200">
                        <span class="text-sm text-secondary-600">{m.focus_quick_actions()}</span>
                        
                        {#if researchFocus.trim()}
                            <button
                                onclick={() => {
                                    currentMessage = m.focus_quick_refine({ focus: researchFocus });
                                    sendChatMessage();
                                }}
                                disabled={isGeneratingResponse || isStreamingMessage}
                                class="text-sm px-3 py-1 bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {m.focus_refine_focus()}
                            </button>
                        {/if}
                        
                        <button
                            onclick={() => {
                                currentMessage = m.focus_quick_specific();
                                sendChatMessage();
                            }}
                            disabled={isGeneratingResponse || isStreamingMessage}
                            class="text-sm px-3 py-1 bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {m.focus_make_specific()}
                        </button>
                        <button
                            onclick={() => {
                                currentMessage = m.focus_quick_gap();
                                sendChatMessage();
                            }}
                            disabled={isGeneratingResponse || isStreamingMessage}
                            class="text-sm px-3 py-1 bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {m.focus_identify_gap()}
                        </button>
                        
                        {#if citations && citations.length > 0}
                            <button
                                onclick={() => {
                                    currentMessage = m.focus_quick_citations();
                                    sendChatMessage();
                                }}
                                disabled={isGeneratingResponse || isStreamingMessage}
                                class="text-sm px-3 py-1 bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {m.focus_connect_citations()}
                            </button>
                        {/if}
                        
                        <!-- Show retry button for the last message if it was an error -->
                        {#if chatMessages.length > 0 && chatMessages[chatMessages.length - 1].error}
                            <button
                                onclick={() => {
                                    // Remove the error message and retry the last user message
                                    const lastErrorIndex = chatMessages.length - 1;
                                    const lastUserMessage = chatMessages.slice(0, lastErrorIndex).findLast(m => m.role === 'user');
                                    if (lastUserMessage) {
                                        chatMessages = chatMessages.slice(0, lastErrorIndex);
                                        currentMessage = lastUserMessage.content;
                                        sendChatMessage();
                                    }
                                }}
                                disabled={isGeneratingResponse || isStreamingMessage}
                                class="text-sm px-3 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {m.focus_retry()}
                            </button>
                        {/if}
                        
                        <!-- Clear chat button in quick actions -->
                        <button
                            onclick={clearChatHistory}
                            disabled={isGeneratingResponse || isStreamingMessage}
                            class="text-sm px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full hover:bg-secondary-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {m.focus_clear_chat()}
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    </Card>

    <!-- Navigation -->
    {#if !canProceedToNextStep()}
        <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div class="flex items-center">
                <Icon icon="heroicons:exclamation-triangle" class="w-5 h-5 text-amber-600 mr-2" />
                <span class="text-sm font-medium text-amber-800">{m.focus_research_required()}</span>
            </div>
            <p class="text-sm text-amber-700 mt-1">
                {m.focus_research_required_help()}
            </p>
        </div>
    {/if}
    <div class="flex justify-between">
        <Button
            onclick={onPreviousStep}
            variant="secondary"
            iconLeft="heroicons:arrow-left"
        >
            {m.focus_previous_step()}
        </Button>
        <Button
            onclick={proceedToNextStep}
            disabled={!canProceedToNextStep()}
            variant="primary"
            iconRight="heroicons:arrow-right"
        >
            {m.focus_next_step()}
        </Button>
    </div>
</div>