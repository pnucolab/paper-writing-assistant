<script lang="ts">
    import type { Content, Editor } from '@tiptap/core';
    import { EdraEditor, EdraToolBar } from '$lib/components/edra/headless/index';
    import DragHandle from '$lib/components/edra/components/DragHandle.svelte';
    import BubbleMenu from '$lib/components/edra/components/BubbleMenu.svelte';
    import BubbleMenuContent from './BubbleMenuContent.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import { WandSparkles, SearchCheck } from '@lucide/svelte';
    import { performCustomRevision, performAIFactCheck, createWordDiff } from '$lib/utils/revision';
    import '$lib/utils/wikeddiff.js';
    import { marked } from 'marked';

    interface Props {
        initialContent?: Content;
        onContentChange?: (content: Content) => void;
    }

    const { 
        initialContent = "",
        onContentChange
    }: Props = $props();

    // Editor states
    let content = $state<Content>(initialContent);
    let editor = $state<Editor>();

    // Watch for changes to initialContent and update editor
    $effect(() => {
        if (editor && initialContent !== undefined && initialContent !== content) {
            // Update editor content when initialContent prop changes
            if (typeof initialContent === 'string') {
                // If it's markdown string, set it directly
                (editor.storage as any).markdown?.setMarkdown?.(initialContent) || editor.commands.setContent(initialContent);
            } else {
                // If it's JSON content, set it as JSON
                editor.commands.setContent(initialContent);
            }
            content = initialContent;
        }
    });

    // Modal states for BubbleMenu actions
    let showReviseModal = $state(false);
    let showFactCheckModal = $state(false);
    let originalText = $state('');
    let revisedText = $state('');
    let factCheckResult = $state('');
    let isLoadingRevision = $state(false);
    let isLoadingFactCheck = $state(false);
    let customPrompt = $state('');
    let reviewerAssessment = $state('');
    let currentSelectionRange = $state({ from: 0, to: 0 });

    function onUpdate() {
        if (editor) {
            // Get content as markdown for the callback (for saving)
            const mdContent = (editor.storage as any).markdown?.getMarkdown?.() || editor.getText();
            // Get JSON for internal state
            const jsonContent = editor.getJSON();
            
            content = jsonContent;
            onContentChange?.(mdContent);
        }
    }

    // Event handlers for BubbleMenu
    function handleAIRevise(event: CustomEvent) {
        const { selectedText, selectionRange } = event.detail;

        // Store selection range for later use
        currentSelectionRange = selectionRange;

        // Show modal with selected text, but don't auto-revise
        originalText = selectedText;
        revisedText = selectedText; // Initialize with original text
        reviewerAssessment = '';
        showReviseModal = true;
    }


    async function handleAIFactCheck(event: CustomEvent) {
        const { selectedText } = event.detail;
        
        // Show modal immediately with loading state
        isLoadingFactCheck = true;
        showFactCheckModal = true;
        
        try {
            // Get the full manuscript content for context
            const fullManuscript = (editor?.storage as any).markdown?.getMarkdown?.() || editor?.getText();
            
            // Perform AI fact check
            const result = await performAIFactCheck(selectedText, fullManuscript);
            
            factCheckResult = result.analysis;
                
        } catch (error) {
            console.error('Failed to fact-check text:', error);
            alert('Failed to fact-check text. Please check your LLM settings and try again.');
            showFactCheckModal = false;
        } finally {
            isLoadingFactCheck = false;
        }
    }

    async function handleCustomRevision() {

        // Update to show revision in progress
        isLoadingRevision = true;
        
        try {
            // Get the full manuscript content for context
            const fullManuscript = (editor?.storage as any).markdown?.getMarkdown?.() || editor?.getText();
            
            // Use the current revised text as the base for further revision
            const textToRevise = revisedText || originalText;

            // Use a default prompt if none provided
            const prompt = customPrompt.trim() || 'Improve this text by making it clearer, more concise, and better written while maintaining its original meaning and technical accuracy.';

            // Perform custom revision
            const result = await performCustomRevision(textToRevise, prompt, fullManuscript);
            
            // Update UI with results
            reviewerAssessment = result.reviewerAssessment;
            revisedText = result.revisedText;
            customPrompt = '';
                
        } catch (error) {
            console.error('Failed to perform custom revision:', error);
            alert('Failed to perform custom revision. Please check your LLM settings and try again.');
        } finally {
            isLoadingRevision = false;
        }
    }

    function applyRevision() {
        if (!editor) return;
        
        // Replace the selected text with the revised text using stored selection range
        const { from, to } = currentSelectionRange;
        
        editor.chain()
            .focus()
            .setTextSelection({ from, to })
            .insertContent(revisedText)
            .run();
            
        showReviseModal = false;
    }

    function closeReviseModal() {
        showReviseModal = false;
        originalText = '';
        revisedText = '';
        isLoadingRevision = false;
        customPrompt = '';
        reviewerAssessment = '';
    }

    function closeFactCheckModal() {
        showFactCheckModal = false;
        factCheckResult = '';
        isLoadingFactCheck = false;
    }

    // Reactive computation for diff
    let diffResult = $derived(() => {
        if (originalText && revisedText) {
            return createWordDiff(originalText, revisedText);
        }
        return { diffResult: '' };
    });
</script>

<div class="z-50 mx-5">
    {#if editor && !editor.isDestroyed}
        <DragHandle editor={editor} />
        <BubbleMenu editor={editor}>
            <BubbleMenuContent 
                {editor} 
                on:ai-revise={handleAIRevise}
                on:ai-fact-check={handleAIFactCheck}
            />
        </BubbleMenu>
        <EdraToolBar editor={editor} />
    {/if}
    <EdraEditor
        bind:editor
        {content}
        class="mt-5"
        {onUpdate}
    />
</div>

<!-- AI Revise Modal -->
<Modal 
    show={showReviseModal} 
    title="AI Text Revision"
    onClose={closeReviseModal}
    size="4xl"
>
    {#snippet children()}
        <div class="space-y-4">
            <!-- Reviewer Assessment -->
            {#if reviewerAssessment && !isLoadingRevision}
                <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 class="text-sm font-semibold text-gray-900 mb-2">Reviewer Assessment:</h4>
                    <p class="text-sm text-gray-700">{reviewerAssessment}</p>
                </div>
            {/if}
            
            <!-- Custom Revision Input -->
            {#if originalText === revisedText && !reviewerAssessment && !isLoadingRevision}
                <div class="space-y-4">
                    <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h4 class="text-sm font-semibold text-gray-900 mb-2">Selected Text:</h4>
                        <div class="text-sm text-gray-700 whitespace-pre-wrap">{originalText}</div>
                    </div>

                    <!-- Custom Revision Input -->
                    <div class="p-4 border border-gray-200 rounded-lg">
                        <label for="customPrompt" class="block text-sm font-medium text-gray-700 mb-2">
                            Revision instructions (optional):
                        </label>
                        <textarea
                            id="customPrompt"
                            bind:value={customPrompt}
                            placeholder="Enter specific instructions for revision, or leave blank for general improvement (e.g., 'Make it more concise', 'Add more technical detail', 'Improve clarity')"
                            class="w-full p-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows="3"
                            disabled={isLoadingRevision}
                        ></textarea>
                        <div class="mt-3">
                            <Button
                                onclick={handleCustomRevision}
                                variant="primary"
                                size="sm"
                                disabled={isLoadingRevision}
                            >
                                <WandSparkles class="w-4 h-4 mr-2" />
                                Revise Text with AI
                            </Button>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Unified Diff View -->
            {#if isLoadingRevision}
                <div class="flex items-center justify-center py-8">
                    <WandSparkles class="w-6 h-6 animate-pulse mr-2" />
                    <span class="text-gray-500">Applying revision instructions...</span>
                </div>
            {:else if reviewerAssessment || originalText !== revisedText}
                {#if originalText === revisedText}
                    <!-- No changes made - show original text -->
                    <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h4 class="text-sm font-semibold text-gray-900 mb-2">Original Text (No Changes Needed):</h4>
                        <div class="text-sm text-gray-700 whitespace-pre-wrap">{originalText}</div>
                    </div>
                {:else}
                    <!-- Show diff when changes were made -->
                    {@html diffResult().diffResult}
                {/if}

                <!-- Custom Revision Input (After AI Revision) -->
                <div class="mt-4 p-4 border border-gray-200 rounded-lg">
                    <label for="customPrompt" class="block text-sm font-medium text-gray-700 mb-2">
                        Additional revision instructions:
                    </label>
                    <textarea
                        id="customPrompt"
                        bind:value={customPrompt}
                        placeholder="Enter specific instructions for further revision (e.g., 'Make it more concise', 'Add more technical detail', 'Improve clarity of the methodology section')"
                        class="w-full p-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows="3"
                        disabled={isLoadingRevision}
                    ></textarea>
                    {#if customPrompt.trim()}
                        <div class="mt-2">
                            <Button
                                onclick={handleCustomRevision}
                                variant="primary"
                                size="sm"
                                disabled={isLoadingRevision}
                            >
                                Apply Custom Revision
                            </Button>
                        </div>
                    {/if}
                </div>
            {/if}
            
            <div class="flex justify-between items-center pt-4">
                {#if originalText !== revisedText}
                    <div class="text-xs text-gray-500">
                        <span class="inline-flex items-center">
                            <span class="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded mr-1"></span>
                            Removed
                        </span>
                        <span class="inline-flex items-center ml-4">
                            <span class="w-3 h-3 bg-blue-100 border border-blue-200 rounded mr-1"></span>
                            Added
                        </span>
                    </div>
                {:else}
                    <div></div>
                {/if}
                <div class="flex space-x-3">
                    <Button onclick={closeReviseModal} variant="secondary">Cancel</Button>
                    <Button onclick={applyRevision} variant="primary" disabled={isLoadingRevision}>
                        {isLoadingRevision ? 'Processing...' : 'Apply Revision'}
                    </Button>
                </div>
            </div>
        </div>
    {/snippet}
</Modal>

<!-- AI Fact Check Modal -->
<Modal 
    show={showFactCheckModal} 
    title="AI Fact Check Analysis"
    onClose={closeFactCheckModal}
    size="4xl"
>
    {#snippet children()}
        <div class="space-y-4">
            {#if isLoadingFactCheck}
                <div class="flex items-center justify-center py-8">
                    <SearchCheck class="w-6 h-6 animate-pulse mr-2" />
                    <span class="text-gray-500">Analyzing content for factual accuracy...</span>
                </div>
            {:else}
                <div class="prose prose-sm max-w-none">
                    {@html marked(factCheckResult)}
                </div>
            {/if}
            
            <div class="flex justify-end pt-4">
                <Button onclick={closeFactCheckModal} variant="primary" disabled={isLoadingFactCheck}>
                    {isLoadingFactCheck ? 'Processing...' : 'Close'}
                </Button>
            </div>
        </div>
    {/snippet}
</Modal>

<style>
    /* WikEdDiff styling customization */
    :global(.diff-content .wikEdDiffInsert) {
        background-color: #dcfce7 !important;
        color: #166534 !important;
        text-decoration: none !important;
    }
    
    :global(.diff-content .wikEdDiffDelete) {
        background-color: #fecaca !important;
        color: #dc2626 !important;
        text-decoration: line-through !important;
    }
    
    :global(.diff-content .wikEdDiffBlock) {
        background-color: #e0f2fe !important;
        border: 1px solid #0284c7 !important;
        border-radius: 4px !important;
        padding: 2px 4px !important;
        margin: 0 2px !important;
    }
    
    :global(.diff-content .wikEdDiffMarkLeft) {
        background-color: #fef3c7 !important;
        color: #d97706 !important;
    }
    
    :global(.diff-content .wikEdDiffMarkRight) {
        background-color: #fef3c7 !important;
        color: #d97706 !important;
    }
    
    /* Ensure proper text wrapping and spacing */
    :global(.diff-content) {
        word-wrap: break-word;
        white-space: pre-wrap;
    }
    
    /* Custom styling for our fallback diff */
    :global(.diff-content .bg-red-100) {
        background-color: #fecaca !important;
        color: #dc2626 !important;
        padding: 1px 3px !important;
        border-radius: 3px !important;
    }
    
    :global(.diff-content .bg-green-100) {
        background-color: #dcfce7 !important;
        color: #166534 !important;
        padding: 1px 3px !important;
        border-radius: 3px !important;
    }
</style>