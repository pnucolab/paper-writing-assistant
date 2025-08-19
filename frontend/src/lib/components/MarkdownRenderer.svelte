<script lang="ts">
	import { marked } from 'marked';

	let { 
		content = '',
		class: className = ''
	}: {
		content: string;
		class?: string;
	} = $props();

	let renderedContent = $state('');

	// Configure marked for safe rendering
	marked.setOptions({
		breaks: true,
		gfm: true
	});

	// Simple HTML escaping function
	function escapeHtml(unsafe: string): string {
		return unsafe
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	// Re-render when content changes
	$effect(() => {
		if (content) {
			try {
				const rawHtml = marked.parse(content) as string;
				// Add custom CSS classes to the rendered HTML
				let processedHtml = rawHtml
					.replace(/<p>/g, '<p class="mb-2 last:mb-0">')
					.replace(/<pre><code>/g, '<pre class="bg-secondary-100 rounded p-3 overflow-x-auto my-2"><code class="text-sm font-mono">')
					.replace(/<code>/g, '<code class="bg-secondary-100 px-1 py-0.5 rounded text-sm font-mono">')
					.replace(/<ul>/g, '<ul class="list-disc list-inside space-y-1 my-2">')
					.replace(/<ol>/g, '<ol class="list-decimal list-inside space-y-1 my-2">')
					.replace(/<h1>/g, '<h1 class="text-lg font-semibold mt-3 mb-2 first:mt-0">')
					.replace(/<h2>/g, '<h2 class="text-base font-semibold mt-3 mb-2 first:mt-0">')
					.replace(/<h3>/g, '<h3 class="text-sm font-semibold mt-3 mb-2 first:mt-0">')
					.replace(/<h4>/g, '<h4 class="text-sm font-medium mt-3 mb-2 first:mt-0">')
					.replace(/<h5>/g, '<h5 class="text-sm font-medium mt-3 mb-2 first:mt-0">')
					.replace(/<h6>/g, '<h6 class="text-sm font-medium mt-3 mb-2 first:mt-0">')
					.replace(/<blockquote>/g, '<blockquote class="border-l-4 border-secondary-300 pl-4 my-2 text-secondary-700">')
					.replace(/<a /g, '<a class="text-primary-600 hover:text-primary-700 underline" target="_blank" rel="noopener noreferrer" ');
				
				renderedContent = processedHtml;
			} catch (error) {
				console.error('Failed to parse markdown:', error);
				// Fallback to escaped plain text
				renderedContent = `<p class="mb-2 last:mb-0">${escapeHtml(content)}</p>`;
			}
		} else {
			renderedContent = '';
		}
	});
</script>

<!-- Render the markdown content -->
{#if renderedContent}
	<div class="markdown-content {className}">
		{@html renderedContent}
	</div>
{:else}
	<div class="markdown-content {className}">
		<p class="text-secondary-500">No content to display</p>
	</div>
{/if}

<style>
	/* Additional styling for markdown content */
	:global(.markdown-content) {
		line-height: 1.6;
	}

	/* Ensure proper spacing for nested lists */
	:global(.markdown-content ul ul),
	:global(.markdown-content ol ol),
	:global(.markdown-content ul ol),
	:global(.markdown-content ol ul) {
		margin-top: 0.25rem;
		margin-bottom: 0.25rem;
		margin-left: 1rem;
	}

	/* Style tables if they appear */
	:global(.markdown-content table) {
		border-collapse: collapse;
		width: 100%;
		margin: 0.5rem 0;
	}

	:global(.markdown-content th),
	:global(.markdown-content td) {
		border: 1px solid #e5e7eb;
		padding: 0.5rem;
		text-align: left;
	}

	:global(.markdown-content th) {
		background-color: #f9fafb;
		font-weight: 600;
	}

	/* Style horizontal rules */
	:global(.markdown-content hr) {
		border: none;
		border-top: 1px solid #e5e7eb;
		margin: 1rem 0;
	}

	/* Ensure images are responsive */
	:global(.markdown-content img) {
		max-width: 100%;
		height: auto;
		border-radius: 0.375rem;
		margin: 0.5rem 0;
	}
</style>