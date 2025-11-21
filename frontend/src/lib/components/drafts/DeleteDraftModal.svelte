<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		show: boolean;
		draftTitle: string;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let { show, draftTitle, onConfirm, onCancel }: Props = $props();
</script>

<Modal {show} title={m.drafts_delete_confirm_title()} size="sm" onClose={onCancel}>
	<div class="space-y-4">
		<p class="text-secondary-700">
			{m.drafts_delete_confirm({ title: draftTitle })}
		</p>

		<div class="flex justify-end space-x-3 pt-4">
			<Button variant="secondary" onclick={onCancel}>
				{m.drafts_delete_cancel()}
			</Button>
			<Button variant="primary" onclick={onConfirm} iconLeft="heroicons:trash">
				{m.drafts_delete_confirm_button()}
			</Button>
		</div>
	</div>
</Modal>
