<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import { onMount } from 'svelte';
	import { DragHandlePlugin } from '$lib/components/edra/extensions/drag-handle/index.js';
	import Button from '$lib/components/ui/Button.svelte';
	import { WandSparkles, NotebookPen, SearchCheck } from '@lucide/svelte';
	import type { Node } from '@tiptap/pm/model';
	import { clickOutside } from '$lib/utils/clickOutside';
	import { performAIRevision, performCustomRevision, performAIFactCheck, createWordDiff } from '$lib/utils/revision';
	import Modal from '$lib/components/ui/Modal.svelte';
	import '$lib/utils/wikeddiff.js';

	interface Props {
		editor: Editor;
	}

	const { editor }: Props = $props();

	let currentNode: Node | null = $state(null);
	let currentNodePos: number = $state(-1);

	const pluginKey = 'globalDragHandle';

	onMount(() => {
		const plugin = DragHandlePlugin({
			pluginKey: pluginKey,
			dragHandleWidth: 32,
			scrollTreshold: 100,
			dragHandleSelector: '.drag-handle',
			excludedTags: ['pre', 'code', 'table p'],
			customNodes: [],
			onMouseMove: onMouseMove
		});
		editor.registerPlugin(plugin);
		return () => editor.unregisterPlugin(pluginKey);
	});

	const onMouseMove = (data: { node: Node; pos: number }) => {
		if (data.node) currentNode = data.node;
		currentNodePos = data.pos;
	};

	let showAIDropdown = $state(false);
	let isProcessing = $state(false);
	let showReviseModal = $state(false);
	let showFactCheckModal = $state(false);
	let originalText = $state('');
	let revisedText = $state('');
	let factCheckResult = $state('');
	let isLoadingRevision = $state(false);
	let isLoadingFactCheck = $state(false);
	let revisionStage = $state(''); // 'reviewing' or 'revising'
	let customPrompt = $state('');
	let reviewerAssessment = $state('');

	function toggleAIDropdown() {
		showAIDropdown = !showAIDropdown;
	}

	function closeAIDropdown() {
		showAIDropdown = false;
	}

	async function handleAIRevise() {
		closeAIDropdown();
		
		if (isProcessing) return;
		
		// Get selected text from the current node
		const selectedText = editor.state.doc.textBetween(currentNodePos, currentNodePos + (currentNode?.nodeSize || 0));
		
		if (!selectedText.trim()) {
			alert('No text found to revise. Please ensure the cursor is positioned on a paragraph with content.');
			return;
		}

		// Show modal immediately with loading state
		originalText = selectedText;
		revisedText = '';
		isLoadingRevision = true;
		revisionStage = 'reviewing';
		showReviseModal = true;
		isProcessing = true;
		
		try {
			// Get the full manuscript content for context
			const fullManuscript = (editor.storage as any).markdown?.getMarkdown?.() || editor.getText();
			
			// Perform the AI revision workflow
			const result = await performAIRevision(selectedText, fullManuscript);
			
			// Store reviewer assessment for display
			reviewerAssessment = result.reason;
			revisedText = result.revisedText || selectedText;
			
			// Update revision stage for UI feedback
			if (result.needsRevision) {
				revisionStage = 'revising';
			}
				
		} catch (error) {
			console.error('Failed to revise text:', error);
			alert('Failed to revise text. Please check your LLM settings and try again.');
			showReviseModal = false;
		} finally {
			isProcessing = false;
			isLoadingRevision = false;
			revisionStage = '';
		}
	}

	async function handleAIFactCheck() {
		closeAIDropdown();
		
		if (isProcessing) return;
		
		// Get selected text from the current node
		const selectedText = editor.state.doc.textBetween(currentNodePos, currentNodePos + (currentNode?.nodeSize || 0));
		
		if (!selectedText.trim()) {
			alert('No text found to fact-check. Please ensure the cursor is positioned on a paragraph with content.');
			return;
		}

		// Show modal immediately with loading state
		factCheckResult = '';
		isLoadingFactCheck = true;
		showFactCheckModal = true;
		isProcessing = true;
		
		try {
			// Get the full manuscript content for context
			const fullManuscript = (editor.storage as any).markdown?.getMarkdown?.() || editor.getText();
			
			// Perform AI fact check
			const result = await performAIFactCheck(selectedText, fullManuscript);
			
			factCheckResult = result.analysis;
				
		} catch (error) {
			console.error('Failed to fact-check text:', error);
			alert('Failed to fact-check text. Please check your LLM settings and try again.');
			showFactCheckModal = false;
		} finally {
			isProcessing = false;
			isLoadingFactCheck = false;
		}
	}

	function applyRevision() {
		// Replace the current node content with the revised text
		const from = currentNodePos;
		const to = currentNodePos + (currentNode?.nodeSize || 0);
		
		editor.chain()
			.focus()
			.setTextSelection({ from, to })
			.insertContent(revisedText)
			.run();
			
		showReviseModal = false;
	}

	async function handleCustomRevision() {
		if (!customPrompt.trim()) {
			alert('Please enter revision instructions.');
			return;
		}

		// Update to show revision in progress
		isLoadingRevision = true;
		revisionStage = 'custom-revising';
		
		try {
			// Get the full manuscript content for context
			const fullManuscript = (editor.storage as any).markdown?.getMarkdown?.() || editor.getText();
			
			// Use the current revised text as the base for further revision
			const textToRevise = revisedText || originalText;
			
			// Perform custom revision
			const result = await performCustomRevision(textToRevise, customPrompt, fullManuscript);
			
			// Update UI with results
			reviewerAssessment = result.reviewerAssessment;
			revisedText = result.revisedText;
			customPrompt = '';
				
		} catch (error) {
			console.error('Failed to perform custom revision:', error);
			alert('Failed to perform custom revision. Please check your LLM settings and try again.');
		} finally {
			isLoadingRevision = false;
			revisionStage = '';
		}
	}


	function closeReviseModal() {
		showReviseModal = false;
		originalText = '';
		revisedText = '';
		isLoadingRevision = false;
		revisionStage = '';
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

<div aria-label="AI suggestions" role="group" onmouseleave={closeAIDropdown} class="drag-handle flex !h-fit !w-fit !flex-row items-center justify-center gap-1">
	<!-- AI Dropdown -->
	<div class="relative">
		<Button 
			variant="ghost" 
			class="!size-6 rounded-sm !p-0" 
			onclick={toggleAIDropdown}
			disabled={isProcessing}
		>
			{#if isProcessing}
				<WandSparkles class="w-4 h-4 animate-spin" />
			{:else}
				<WandSparkles class="w-4 h-4" />
			{/if}
		</Button>
		
		{#if showAIDropdown}
			<div
				class="absolute z-50 min-w-48 bg-white border border-gray-200 rounded-md shadow-lg top-full left-0 m-0"
				use:clickOutside={closeAIDropdown}
				role="menu"
				aria-orientation="vertical"
			>
				<div class="py-1">
					<button
						type="button"
						class="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
						onclick={handleAIRevise}
						disabled={isProcessing}
						role="menuitem"
					>
						<NotebookPen class="w-4 h-4 mr-3" />
						{isProcessing ? 'Processing...' : 'AI Revise'}
					</button>
					<button
						type="button"
						class="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
						onclick={handleAIFactCheck}
						disabled={isProcessing}
						role="menuitem"
					>
						<SearchCheck class="w-4 h-4 mr-3" />
						{isProcessing ? 'Processing...' : 'AI Fact Check'}
					</button>
				</div>
			</div>
		{/if}
	</div>
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
			
			<!-- Unified Diff View -->
			{#if isLoadingRevision}
				<div class="flex items-center justify-center py-8">
					<WandSparkles class="w-6 h-6 animate-spin mr-2" />
					{#if revisionStage === 'reviewing'}
						<span class="text-gray-500">Stage 1: Reviewer analyzing text for revision needs...</span>
					{:else if revisionStage === 'revising'}
						<span class="text-gray-500">Stage 2: Revisor improving the text...</span>
					{:else if revisionStage === 'custom-revising'}
						<span class="text-gray-500">Custom revision: Implementing your specific instructions...</span>
					{:else}
						<span class="text-gray-500">Analyzing and revising text...</span>
					{/if}
				</div>
			{:else}
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
				
				<!-- Custom Revision Input -->
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
					<SearchCheck class="w-6 h-6 animate-spin mr-2" />
					<span class="text-gray-500">Analyzing content for factual accuracy...</span>
				</div>
			{:else}
				<div class="prose prose-sm max-w-none">
					{@html factCheckResult.replace(/\n/g, '<br>')}
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