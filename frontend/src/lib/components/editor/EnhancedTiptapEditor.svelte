<script lang="ts">
	import { onMount } from 'svelte';
	import { createEditor, Editor, EditorContent, BubbleMenu } from 'svelte-tiptap';
	import { SvelteNodeViewRenderer } from 'svelte-tiptap';
	import StarterKit from '@tiptap/starter-kit';
	import { Node, mergeAttributes } from '@tiptap/core';
	import { marked } from 'marked';
	
	import CommentNode from './CommentNode.svelte';
	import FactCheckNode from './FactCheckNode.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '@iconify/svelte';

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
	let editor;
	let lastContent = content;

	// Convert markdown to HTML
	function markdownToHtml(markdown: string): string {
		if (!markdown) return '';
		return marked(markdown);
	}

	// Create custom Comment extension
	const CommentExtension = Node.create({
		name: 'comment',
		group: 'block',
		atom: true,
		
		addAttributes() {
			return {
				comment: {
					default: '',
					parseHTML: element => element.getAttribute('data-comment'),
					renderHTML: attributes => {
						return {
							'data-comment': attributes.comment,
						}
					},
				},
			}
		},

		parseHTML() {
			return [
				{
					tag: 'div[data-type="comment"]',
				},
			]
		},

		renderHTML({ HTMLAttributes }) {
			return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'comment' })]
		},

		addNodeView() {
			return SvelteNodeViewRenderer(CommentNode)
		},
	});

	// Create custom FactCheck extension
	const FactCheckExtension = Node.create({
		name: 'factcheck',
		group: 'block',
		atom: true,
		
		addAttributes() {
			return {
				status: {
					default: 'pending',
					parseHTML: element => element.getAttribute('data-status'),
					renderHTML: attributes => {
						return {
							'data-status': attributes.status,
						}
					},
				},
				notes: {
					default: '',
					parseHTML: element => element.getAttribute('data-notes'),
					renderHTML: attributes => {
						return {
							'data-notes': attributes.notes,
						}
					},
				},
				sources: {
					default: '',
					parseHTML: element => element.getAttribute('data-sources'),
					renderHTML: attributes => {
						return {
							'data-sources': attributes.sources,
						}
					},
				},
			}
		},

		parseHTML() {
			return [
				{
					tag: 'div[data-type="factcheck"]',
				},
			]
		},

		renderHTML({ HTMLAttributes }) {
			return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'factcheck' })]
		},

		addNodeView() {
			return SvelteNodeViewRenderer(FactCheckNode)
		},
	});

	onMount(() => {
		editor = createEditor({
			extensions: [
				StarterKit,
				CommentExtension,
				FactCheckExtension,
			],
			content: markdownToHtml(content),
			editable: editable,
			onUpdate: ({ editor }) => {
				const html = editor.getHTML();
				if (html !== lastContent) {
					lastContent = html;
					onUpdate(html);
				}
			},
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none focus:outline-none p-4'
				}
			}
		});

		return () => {
			if ($editor && $editor.destroy) {
				$editor.destroy();
			}
		}
	});

	// Update content when prop changes
	$effect(() => {
		if ($editor && content !== lastContent) {
			const htmlContent = markdownToHtml(content);
			if (htmlContent !== $editor.getHTML()) {
				lastContent = content;
				$editor.commands.setContent(htmlContent, false);
			}
		}
	});

	// Update editable state when prop changes  
	$effect(() => {
		if ($editor && $editor.isEditable !== editable) {
			$editor.setEditable(editable);
		}
	});

	// Helper functions to add comments and fact-checks
	function addComment() {
		if ($editor) {
			$editor.chain().focus().insertContent({
				type: 'comment',
				attrs: {
					comment: '',
				},
			}).run();
		}
	}

	function addFactCheck() {
		if ($editor) {
			$editor.chain().focus().insertContent({
				type: 'factcheck',
				attrs: {
					status: 'pending',
					notes: '',
					sources: '',
				},
			}).run();
		}
	}

	// Export editor instance
	export function getEditor() {
		return $editor;
	}
</script>

<div class="enhanced-tiptap-editor border border-secondary-200 rounded-lg bg-white {className}">
	{#if $editor}
		<!-- Floating Menu for adding comments and fact-checks -->
		<BubbleMenu editor={$editor} tippyOptions={{ duration: 100 }}>
			<div class="flex space-x-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
				<Button
					onclick={addComment}
					variant="secondary"
					size="sm"
					iconLeft="heroicons:chat-bubble-left-ellipsis"
				>
					Add Comment
				</Button>
				<Button
					onclick={addFactCheck}
					variant="secondary"
					size="sm"
					iconLeft="heroicons:shield-check"
				>
					Fact Check
				</Button>
			</div>
		</BubbleMenu>
	{/if}

	<!-- Editor Content -->
	<EditorContent editor={$editor} class="min-h-96" />

	{#if editable}
		<!-- Toolbar -->
		<div class="border-t border-secondary-200 p-3 bg-secondary-50">
			<div class="flex items-center space-x-2">
				<span class="text-sm text-secondary-600">Add annotations:</span>
				<Button
					onclick={addComment}
					variant="secondary"
					size="sm"
					iconLeft="heroicons:chat-bubble-left-ellipsis"
				>
					Comment
				</Button>
				<Button
					onclick={addFactCheck}
					variant="secondary"
					size="sm"
					iconLeft="heroicons:shield-check"
				>
					Fact Check
				</Button>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(.enhanced-tiptap-editor .ProseMirror) {
		outline: none;
	}
	
	:global(.enhanced-tiptap-editor .ProseMirror p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: #adb5bd;
		pointer-events: none;
		height: 0;
	}
	
	:global(.enhanced-tiptap-editor .ProseMirror h1) {
		font-size: 1.875rem;
		font-weight: 700;
		margin-top: 1.5rem;
		margin-bottom: 1rem;
	}
	
	:global(.enhanced-tiptap-editor .ProseMirror h2) {
		font-size: 1.5rem;
		font-weight: 600;
		margin-top: 1.25rem;
		margin-bottom: 0.75rem;
	}
	
	:global(.enhanced-tiptap-editor .ProseMirror h3) {
		font-size: 1.25rem;
		font-weight: 600;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}
	
	:global(.enhanced-tiptap-editor .ProseMirror p) {
		margin-bottom: 0.75rem;
		line-height: 1.6;
	}
	
	:global(.enhanced-tiptap-editor .ProseMirror ul, .enhanced-tiptap-editor .ProseMirror ol) {
		margin-left: 1.5rem;
		margin-bottom: 0.75rem;
	}
	
	:global(.enhanced-tiptap-editor .ProseMirror blockquote) {
		border-left: 4px solid #e5e7eb;
		padding-left: 1rem;
		margin: 1rem 0;
		font-style: italic;
	}
	
	:global(.enhanced-tiptap-editor .ProseMirror code) {
		background-color: #f3f4f6;
		border-radius: 0.25rem;
		padding: 0.125rem 0.25rem;
		font-family: 'Courier New', monospace;
	}
	
	:global(.enhanced-tiptap-editor .ProseMirror pre) {
		background-color: #f3f4f6;
		border-radius: 0.5rem;
		padding: 1rem;
		overflow-x: auto;
		margin: 1rem 0;
	}
	
	:global(.enhanced-tiptap-editor .ProseMirror strong) {
		font-weight: 700;
	}
	
	:global(.enhanced-tiptap-editor .ProseMirror em) {
		font-style: italic;
	}

	/* Bubble menu styling */
	:global(.tippy-box[data-theme~='light']) {
		background-color: white;
		color: #374151;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
	}
</style>