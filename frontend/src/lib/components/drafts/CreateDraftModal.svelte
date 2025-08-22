<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '@iconify/svelte';
	import { toKebabCase } from '$lib/utils/text';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		show?: boolean;
		isCreating?: boolean;
		onClose?: () => void;
		onCreate?: (draftIdentifier: string, kebabId: string) => void;
		existingIds?: string[];
	}

	let {
		show = false,
		isCreating = false,
		onClose = () => {},
		onCreate = () => {},
		existingIds = []
	}: Props = $props();

	let draftIdentifier = $state('');
	
	let kebabId = $derived(toKebabCase(draftIdentifier));
	let isUnique = $derived(!existingIds.includes(kebabId));
	let isValidInput = $derived(draftIdentifier.trim().length > 0);
	let canCreate = $derived(isValidInput && isUnique && kebabId.length > 0);

	function handleCreate() {
		if (!canCreate) return;
		onCreate(draftIdentifier.trim(), kebabId);
	}

	function handleClose() {
		draftIdentifier = '';
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && canCreate && !isCreating) {
			handleCreate();
		}
	}

	// Reset form when modal closes
	$effect(() => {
		if (!show) {
			draftIdentifier = '';
		}
	});
</script>

<Modal
	{show}
	title={m.create_draft_modal_title()}
	size="md"
	onClose={handleClose}
	closeOnBackdrop={!isCreating}
	showCloseButton={!isCreating}
>
	{#snippet children()}
		<div class="space-y-4">
			<p class="text-sm text-secondary-600">
				{m.create_draft_modal_description()}
			</p>
			
			<div>
				<label for="draft-identifier" class="block text-sm font-medium text-secondary-700 mb-2">
					{m.create_draft_identifier_label()}
				</label>
				<input
					id="draft-identifier"
					type="text"
					bind:value={draftIdentifier}
					placeholder={m.create_draft_identifier_placeholder()}
					disabled={isCreating}
					class="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-secondary-50"
					onkeydown={handleKeydown}
				/>
				
				{#if isValidInput && !isUnique}
					<div class="mt-2 flex items-center text-red-600">
						<Icon icon="heroicons:exclamation-triangle" class="w-4 h-4 mr-1" />
						<span class="text-sm">{m.create_draft_identifier_in_use()}</span>
					</div>
				{/if}
				
				{#if isValidInput && kebabId.length === 0}
					<div class="mt-2 flex items-center text-amber-600">
						<Icon icon="heroicons:exclamation-triangle" class="w-4 h-4 mr-1" />
						<span class="text-sm">{m.create_draft_letters_numbers_only()}</span>
					</div>
				{/if}
			</div>
			
			<div class="flex justify-end space-x-3 pt-4">
				<Button
					onclick={handleClose}
					variant="secondary"
					size="sm"
					disabled={isCreating}
				>
					{m.create_draft_cancel()}
				</Button>
				<Button
					onclick={handleCreate}
					variant="primary"
					size="sm"
					disabled={!canCreate || isCreating}
				>
					{isCreating ? m.create_draft_creating() : m.create_draft_create()}
				</Button>
			</div>
		</div>
	{/snippet}
</Modal>