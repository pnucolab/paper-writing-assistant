<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import Button from '$lib/components/ui/Button.svelte';
	import { WandSparkles, SearchCheck } from '@lucide/svelte';
	import { createEventDispatcher } from 'svelte';
	// i18n
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		editor: Editor;
	}

	const { editor }: Props = $props();
	const dispatch = createEventDispatcher();

	function handleAIRevise() {
		// Get selected text from the current selection
		const selectedText = getSelectedText();
		
		if (!selectedText.trim()) {
			alert(m.bubble_menu_no_text_selected_revise());
			return;
		}

		// Store selection range before losing focus
		const selectionRange = { from: editor.state.selection.from, to: editor.state.selection.to };

		// Dispatch event to parent component
		dispatch('ai-revise', {
			selectedText,
			selectionRange
		});

		// Clear selection to close bubble menu by setting cursor to end of selection
		editor.commands.setTextSelection(selectionRange.to);
	}

	function handleAIFactCheck() {
		// Get selected text from the current selection
		const selectedText = getSelectedText();
		
		if (!selectedText.trim()) {
			alert(m.bubble_menu_no_text_selected_fact_check());
			return;
		}

		// Store selection range before losing focus
		const selectionRange = { from: editor.state.selection.from, to: editor.state.selection.to };

		// Dispatch event to parent component
		dispatch('ai-fact-check', {
			selectedText,
			selectionRange
		});

		// Clear selection to close bubble menu by setting cursor to end of selection
		editor.commands.setTextSelection(selectionRange.to);
	}


	function getSelectedText(): string {
		const { from, to } = editor.state.selection;
		return editor.state.doc.textBetween(from, to);
	}
</script>

<div class="flex items-center space-x-2 p-1">
	<Button 
		onclick={handleAIRevise} 
		variant="ghost" 
		size="sm"
		class="flex items-center"
	>
		<WandSparkles class="w-4 h-4 mr-1" />
		{m.bubble_menu_ai_revise()}
	</Button>
	
	<Button 
		onclick={handleAIFactCheck} 
		variant="ghost" 
		size="sm"
		class="flex items-center"
	>
		<SearchCheck class="w-4 h-4 mr-1" />
		{m.bubble_menu_ai_fact_check()}
	</Button>
</div>