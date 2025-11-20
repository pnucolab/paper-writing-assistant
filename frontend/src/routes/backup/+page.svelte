<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Label from '$lib/components/ui/Label.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import FileDrop from '$lib/components/ui/FileDrop.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Icon from '@iconify/svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import {
		createBackup,
		restoreBackup,
		downloadBackup,
		readBackupFile
	} from '$lib/utils/backup';

	// State
	let backupPassword = $state('');
	let restorePassword = $state('');
	let restoreFile = $state<File | null>(null);
	let isCreatingBackup = $state(false);
	let isRestoringBackup = $state(false);
	let backupStatus = $state<'idle' | 'success' | 'error'>('idle');
	let restoreStatus = $state<'idle' | 'success' | 'error'>('idle');
	let backupMessage = $state('');
	let restoreMessage = $state('');

	// Derived states for button enable/disable
	let canCreateBackup = $derived(backupPassword.trim().length > 0 && !isCreatingBackup);
	let canRestoreBackup = $derived(
		restoreFile !== null && restorePassword.trim().length > 0 && !isRestoringBackup
	);

	async function handleCreateBackup() {
		if (!backupPassword.trim()) {
			backupStatus = 'error';
			backupMessage = m.backup_password_required();
			return;
		}

		isCreatingBackup = true;
		backupStatus = 'idle';
		backupMessage = '';

		try {
			const backupData = await createBackup(backupPassword);
			downloadBackup(backupData);

			backupStatus = 'success';
			backupMessage = m.backup_created_success();
			backupPassword = '';
		} catch (error) {
			backupStatus = 'error';
			backupMessage = error instanceof Error ? error.message : m.backup_creation_failed();
		} finally {
			isCreatingBackup = false;
		}
	}

	async function handleRestoreBackup() {
		if (!restoreFile) {
			restoreStatus = 'error';
			restoreMessage = m.backup_file_required();
			return;
		}

		if (!restorePassword.trim()) {
			restoreStatus = 'error';
			restoreMessage = m.backup_password_required();
			return;
		}

		isRestoringBackup = true;
		restoreStatus = 'idle';
		restoreMessage = '';

		try {
			const backupData = await readBackupFile(restoreFile);
			await restoreBackup(backupData, restorePassword);

			restoreStatus = 'success';
			restoreMessage = m.backup_restored_success();
			restorePassword = '';
			restoreFile = null;

			// Reload page after successful restoration
			setTimeout(() => {
				window.location.reload();
			}, 2000);
		} catch (error) {
			restoreStatus = 'error';
			restoreMessage = error instanceof Error ? error.message : m.backup_restoration_failed();
		} finally {
			isRestoringBackup = false;
		}
	}

	function handleFileSelect(file: File) {
		restoreFile = file;
		restoreStatus = 'idle';
		restoreMessage = '';
	}

	// Force reactivity when language changes
	$effect(() => {
		getLocale();
	});
</script>

<div class="max-w-7xl mx-auto px-6 py-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-semibold text-gray-900 mb-2">{m.backup_page_title()}</h1>
		<p class="text-gray-600">{m.backup_page_description()}</p>
	</div>

	<div class="space-y-8">
		<!-- Create Backup Card -->
		<Card>
			{#snippet header()}
				<h3 class="text-lg font-semibold text-gray-900">{m.backup_create_title()}</h3>
				<p class="text-sm text-gray-600 mt-1">{m.backup_create_description()}</p>
			{/snippet}

			<div class="space-y-4">
				<div>
					<Label for="backup-password" required>{m.backup_password_label()}</Label>
					<Input
						id="backup-password"
						bind:value={backupPassword}
						type="password"
						placeholder={m.backup_password_placeholder()}
						helpText={m.backup_password_help()}
						required
					/>
				</div>

				<div class="flex items-center space-x-3">
					<Button
						onclick={handleCreateBackup}
						disabled={!canCreateBackup}
						iconLeft={isCreatingBackup ? "heroicons:arrow-path" : "heroicons:arrow-down-tray"}
					>
						{isCreatingBackup ? m.backup_creating() : m.backup_create_button()}
					</Button>

					{#if backupStatus !== 'idle'}
						<div class="flex items-center space-x-2">
							{#if backupStatus === 'success'}
								<Icon icon="heroicons:check-circle" class="w-5 h-5 text-green-600" />
								<span class="text-sm text-green-600">{backupMessage}</span>
							{:else if backupStatus === 'error'}
								<Icon icon="heroicons:x-circle" class="w-5 h-5 text-red-600" />
								<span class="text-sm text-red-600">{backupMessage}</span>
							{/if}
						</div>
					{/if}
				</div>

				<Alert variant="warning" title={m.backup_warning_title()}>
					<p>{m.backup_warning_message()}</p>
				</Alert>
			</div>
		</Card>

		<!-- Restore Backup Card -->
		<Card>
			{#snippet header()}
				<h3 class="text-lg font-semibold text-gray-900">{m.backup_restore_title()}</h3>
				<p class="text-sm text-gray-600 mt-1">{m.backup_restore_description()}</p>
			{/snippet}

			<div class="space-y-4">
				<div>
					<Label required>{m.backup_file_label()}</Label>
					<FileDrop
						acceptedTypes={['.pwa']}
						onFileSelect={handleFileSelect}
						description={m.backup_file_label()}
						formatText="Paper Writer Archive (.pwa)"
					/>
					{#if restoreFile}
						<p class="text-sm text-secondary-600 mt-1">
							{m.backup_file_selected()}: {restoreFile.name}
						</p>
					{/if}
				</div>

				<div>
					<Label for="restore-password" required>{m.backup_password_label()}</Label>
					<Input
						id="restore-password"
						bind:value={restorePassword}
						type="password"
						placeholder={m.backup_password_placeholder()}
						helpText={m.backup_restore_password_help()}
						required
					/>
				</div>

				<div class="flex items-center space-x-3">
					<Button
						onclick={handleRestoreBackup}
						disabled={!canRestoreBackup}
						variant="secondary"
						iconLeft={isRestoringBackup ? "heroicons:arrow-path" : "heroicons:arrow-up-tray"}
					>
						{isRestoringBackup ? m.backup_restoring() : m.backup_restore_button()}
					</Button>

					{#if restoreStatus !== 'idle'}
						<div class="flex items-center space-x-2">
							{#if restoreStatus === 'success'}
								<Icon icon="heroicons:check-circle" class="w-5 h-5 text-green-600" />
								<span class="text-sm text-green-600">{restoreMessage}</span>
							{:else if restoreStatus === 'error'}
								<Icon icon="heroicons:x-circle" class="w-5 h-5 text-red-600" />
								<span class="text-sm text-red-600">{restoreMessage}</span>
							{/if}
						</div>
					{/if}
				</div>

				<Alert variant="error" title={m.backup_restore_warning_title()}>
					<p>{m.backup_restore_warning_message()}</p>
				</Alert>
			</div>
		</Card>
	</div>
</div>
