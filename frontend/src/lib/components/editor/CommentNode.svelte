<script lang="ts">
	import { Node as ProseMirrorNode } from '@tiptap/pm/model';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '@iconify/svelte';

	interface Props {
		node: ProseMirrorNode;
		updateAttributes: (attributes: Record<string, any>) => void;
		deleteNode: () => void;
	}

	let { node, updateAttributes, deleteNode }: Props = $props();

	// Extract comment data from node attributes
	let commentText = $state(node.attrs.comment || '');
	let isEditing = $state(false);

	function saveComment() {
		updateAttributes({ comment: commentText });
		isEditing = false;
	}

	function cancelEdit() {
		commentText = node.attrs.comment || '';
		isEditing = false;
	}
</script>

<div class="comment-node border-l-4 border-blue-500 bg-blue-50 p-3 mb-2 rounded-r-lg">
	<div class="flex items-start justify-between">
		<div class="flex items-center space-x-2 mb-2">
			<Icon icon="heroicons:chat-bubble-left-ellipsis" class="w-4 h-4 text-blue-600" />
			<span class="text-sm font-medium text-blue-800">Comment</span>
		</div>
		<div class="flex space-x-1">
			{#if !isEditing}
				<button
					onclick={() => isEditing = true}
					class="p-1 hover:bg-blue-100 rounded"
					title="Edit comment"
				>
					<Icon icon="heroicons:pencil" class="w-3 h-3 text-blue-600" />
				</button>
			{/if}
			<button
				onclick={deleteNode}
				class="p-1 hover:bg-red-100 rounded"
				title="Delete comment"
			>
				<Icon icon="heroicons:trash" class="w-3 h-3 text-red-600" />
			</button>
		</div>
	</div>

	{#if isEditing}
		<div class="space-y-2">
			<textarea
				bind:value={commentText}
				placeholder="Add your comment..."
				class="w-full p-2 text-sm border border-blue-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
				rows="3"
			></textarea>
			<div class="flex justify-end space-x-2">
				<Button onclick={cancelEdit} variant="secondary" size="sm">Cancel</Button>
				<Button onclick={saveComment} variant="primary" size="sm">Save</Button>
			</div>
		</div>
	{:else}
		<p class="text-sm text-blue-700 whitespace-pre-wrap">{commentText || 'Click edit to add a comment'}</p>
	{/if}
</div>

<style>
	.comment-node {
		user-select: none;
		margin: 8px 0;
	}
</style>