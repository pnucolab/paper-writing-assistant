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

	// Extract fact-check data from node attributes
	let status = $state(node.attrs.status || 'pending'); // pending, verified, disputed, false
	let notes = $state(node.attrs.notes || '');
	let sources = $state(node.attrs.sources || '');
	let isEditing = $state(false);

	const statusConfig = {
		pending: { color: 'yellow', icon: 'heroicons:clock', label: 'Pending Verification' },
		verified: { color: 'green', icon: 'heroicons:check-circle', label: 'Verified' },
		disputed: { color: 'orange', icon: 'heroicons:exclamation-triangle', label: 'Disputed' },
		false: { color: 'red', icon: 'heroicons:x-circle', label: 'False/Misleading' }
	};

	function saveFactCheck() {
		updateAttributes({ status, notes, sources });
		isEditing = false;
	}

	function cancelEdit() {
		status = node.attrs.status || 'pending';
		notes = node.attrs.notes || '';
		sources = node.attrs.sources || '';
		isEditing = false;
	}

	function updateStatus(newStatus: string) {
		status = newStatus;
		updateAttributes({ status: newStatus, notes, sources });
	}
</script>

<div class="fact-check-node border-l-4 bg-gray-50 p-3 mb-2 rounded-r-lg" 
	 class:border-yellow-500={status === 'pending'}
	 class:bg-yellow-50={status === 'pending'}
	 class:border-green-500={status === 'verified'}
	 class:bg-green-50={status === 'verified'}
	 class:border-orange-500={status === 'disputed'}
	 class:bg-orange-50={status === 'disputed'}
	 class:border-red-500={status === 'false'}
	 class:bg-red-50={status === 'false'}>
	
	<div class="flex items-start justify-between">
		<div class="flex items-center space-x-2 mb-2">
			<Icon icon={statusConfig[status].icon} 
				  class="w-4 h-4 {status === 'pending' ? 'text-yellow-600' : status === 'verified' ? 'text-green-600' : status === 'disputed' ? 'text-orange-600' : 'text-red-600'}" />
			<span class="text-sm font-medium {status === 'pending' ? 'text-yellow-800' : status === 'verified' ? 'text-green-800' : status === 'disputed' ? 'text-orange-800' : 'text-red-800'}">
				Fact Check: {statusConfig[status].label}
			</span>
		</div>
		<div class="flex space-x-1">
			{#if !isEditing}
				<button
					onclick={() => isEditing = true}
					class="p-1 hover:bg-gray-100 rounded"
					title="Edit fact check"
				>
					<Icon icon="heroicons:pencil" class="w-3 h-3 text-gray-600" />
				</button>
			{/if}
			<button
				onclick={deleteNode}
				class="p-1 hover:bg-red-100 rounded"
				title="Delete fact check"
			>
				<Icon icon="heroicons:trash" class="w-3 h-3 text-red-600" />
			</button>
		</div>
	</div>

	{#if isEditing}
		<div class="space-y-3">
			<!-- Status Selection -->
			<div>
				<label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
				<div class="grid grid-cols-2 gap-2">
					{#each Object.entries(statusConfig) as [key, config]}
						<button
							onclick={() => status = key}
							class="flex items-center space-x-2 p-2 border rounded text-sm transition-colors"
							class:border-blue-500={status === key}
							class:bg-blue-50={status === key}
							class:border-gray-200={status !== key}
						>
							<Icon icon={config.icon} class="w-3 h-3" />
							<span>{config.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Notes -->
			<div>
				<label class="block text-xs font-medium text-gray-700 mb-1">Notes</label>
				<textarea
					bind:value={notes}
					placeholder="Add verification notes..."
					class="w-full p-2 text-sm border border-gray-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
					rows="2"
				></textarea>
			</div>

			<!-- Sources -->
			<div>
				<label class="block text-xs font-medium text-gray-700 mb-1">Sources</label>
				<textarea
					bind:value={sources}
					placeholder="Add sources or references..."
					class="w-full p-2 text-sm border border-gray-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
					rows="2"
				></textarea>
			</div>

			<div class="flex justify-end space-x-2">
				<Button onclick={cancelEdit} variant="secondary" size="sm">Cancel</Button>
				<Button onclick={saveFactCheck} variant="primary" size="sm">Save</Button>
			</div>
		</div>
	{:else}
		<div class="space-y-2">
			{#if notes}
				<p class="text-sm text-gray-700"><strong>Notes:</strong> {notes}</p>
			{/if}
			{#if sources}
				<p class="text-sm text-gray-700"><strong>Sources:</strong> {sources}</p>
			{/if}
			{#if !notes && !sources}
				<p class="text-sm text-gray-500 italic">Click edit to add verification details</p>
			{/if}

			<!-- Quick status buttons -->
			<div class="flex space-x-1 pt-2">
				{#each Object.entries(statusConfig) as [key, config]}
					<button
						onclick={() => updateStatus(key)}
						class="flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors"
						class:opacity-100={status === key}
						class:opacity-60={status !== key}
						class:bg-yellow-100={key === 'pending'}
						class:text-yellow-700={key === 'pending'}
						class:bg-green-100={key === 'verified'}
						class:text-green-700={key === 'verified'}
						class:bg-orange-100={key === 'disputed'}
						class:text-orange-700={key === 'disputed'}
						class:bg-red-100={key === 'false'}
						class:text-red-700={key === 'false'}
						title={config.label}
					>
						<Icon icon={config.icon} class="w-3 h-3" />
						<span>{key === 'false' ? 'False' : key.charAt(0).toUpperCase() + key.slice(1)}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.fact-check-node {
		user-select: none;
		margin: 8px 0;
	}
</style>