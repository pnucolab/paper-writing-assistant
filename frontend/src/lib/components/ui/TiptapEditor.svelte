<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';

	// Props
	let {
		content = '',
		editable = true,
		onUpdate = () => {},
		class: className = ''
	}: {
		content?: string;
		editable?: boolean;
		onUpdate?: (content: string) => void;
		class?: string;
	} = $props();

	// Editor state
	let editor: Editor | null = null;
	let element: HTMLElement;

	onMount(() => {
		editor = new Editor({
			element: element,
			extensions: [StarterKit],
			content: content,
			editable: editable,
			onUpdate: ({ editor }) => {
				const html = editor.getHTML();
				onUpdate(html);
			},
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none focus:outline-none p-4'
				}
			}
		});
	});

	onDestroy(() => {
		if (editor) {
			editor.destroy();
		}
	});

	// Update content when prop changes
	$effect(() => {
		if (editor && content !== editor.getHTML()) {
			editor.commands.setContent(content, false);
		}
	});

	// Update editable state when prop changes
	$effect(() => {
		if (editor) {
			editor.setEditable(editable);
		}
	});

	// Export editor instance
	export function getEditor() {
		return editor;
	}
</script>

<div 
	bind:this={element} 
	class="tiptap-editor border border-secondary-200 rounded-lg min-h-96 bg-white {className}"
></div>

<style>
	:global(.tiptap-editor .ProseMirror) {
		outline: none;
	}
	
	:global(.tiptap-editor .ProseMirror p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: #adb5bd;
		pointer-events: none;
		height: 0;
	}
	
	:global(.tiptap-editor .ProseMirror h1) {
		font-size: 1.875rem;
		font-weight: 700;
		margin-top: 1.5rem;
		margin-bottom: 1rem;
	}
	
	:global(.tiptap-editor .ProseMirror h2) {
		font-size: 1.5rem;
		font-weight: 600;
		margin-top: 1.25rem;
		margin-bottom: 0.75rem;
	}
	
	:global(.tiptap-editor .ProseMirror h3) {
		font-size: 1.25rem;
		font-weight: 600;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}
	
	:global(.tiptap-editor .ProseMirror p) {
		margin-bottom: 0.75rem;
	}
	
	:global(.tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol) {
		margin-left: 1.5rem;
		margin-bottom: 0.75rem;
	}
	
	:global(.tiptap-editor .ProseMirror blockquote) {
		border-left: 4px solid #e5e7eb;
		padding-left: 1rem;
		margin: 1rem 0;
		font-style: italic;
	}
	
	:global(.tiptap-editor .ProseMirror code) {
		background-color: #f3f4f6;
		border-radius: 0.25rem;
		padding: 0.125rem 0.25rem;
		font-family: 'Courier New', monospace;
	}
	
	:global(.tiptap-editor .ProseMirror pre) {
		background-color: #f3f4f6;
		border-radius: 0.5rem;
		padding: 1rem;
		overflow-x: auto;
		margin: 1rem 0;
	}
	
	:global(.tiptap-editor .ProseMirror strong) {
		font-weight: 700;
	}
	
	:global(.tiptap-editor .ProseMirror em) {
		font-style: italic;
	}
</style>