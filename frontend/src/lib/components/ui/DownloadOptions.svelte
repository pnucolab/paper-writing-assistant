<script lang="ts">
	import Button from './Button.svelte';
	import Icon from '@iconify/svelte';
	import { downloadMarkdown, downloadDocxFile, downloadProjectReport, loadCompleteDraftData } from '$lib/utils/downloads';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		draftId: string;
		projectTitle: string;
		manuscriptTitle?: string;
		isCompleted?: boolean;
		content?: string;
		class?: string;
	}

	let { 
		draftId, 
		projectTitle, 
		manuscriptTitle, 
		isCompleted = false, 
		content = '',
		class: className = ''
	}: Props = $props();

	let isDownloading = $state(false);

	async function handleDownloadMarkdown() {
		try {
			isDownloading = true;
			const filename = manuscriptTitle || projectTitle;
			
			if (!content) {
				// Load content from localStorage if not provided
				const draftData = loadCompleteDraftData(draftId);
				const downloadContent = draftData?.content || `# ${filename}\n\n[No content available]`;
				downloadMarkdown(downloadContent, filename);
			} else {
				downloadMarkdown(content, filename);
			}
		} catch (error) {
			console.error('Failed to download markdown:', error);
			alert('Failed to download markdown file');
		} finally {
			isDownloading = false;
		}
	}

	async function handleDownloadDocx() {
		try {
			isDownloading = true;
			const filename = manuscriptTitle || projectTitle;
			
			let downloadContent = content;
			if (!downloadContent) {
				// Load content from localStorage if not provided
				const draftData = loadCompleteDraftData(draftId);
				downloadContent = draftData?.content || `# ${filename}\n\n[No content available]`;
			}
			
			await downloadDocxFile(downloadContent, filename);
		} catch (error) {
			console.error('Failed to download DOCX:', error);
			alert('Failed to download DOCX file');
		} finally {
			isDownloading = false;
		}
	}

	async function handleDownloadReport() {
		try {
			isDownloading = true;
			const draftData = loadCompleteDraftData(draftId);
			
			if (!draftData) {
				alert('Failed to load draft data');
				return;
			}
			
			await downloadProjectReport(draftData);
		} catch (error) {
			console.error('Failed to download report:', error);
			alert('Failed to download project report');
		} finally {
			isDownloading = false;
		}
	}
</script>

<div class="space-y-4 {className}">
	<div class="flex items-center space-x-2 mb-4">
		<Icon icon="heroicons:arrow-down-tray" class="w-5 h-5 text-secondary-600" />
		<h3 class="text-lg font-medium text-secondary-900">Download Options</h3>
		{#if isCompleted}
			<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
				<Icon icon="heroicons:check-circle" class="w-3 h-3 mr-1" />
				Completed
			</span>
		{/if}
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Markdown Download -->
		<div class="border border-secondary-200 rounded-lg p-4">
			<div class="flex items-center space-x-2 mb-2">
				<Icon icon="heroicons:document-text" class="w-5 h-5 text-blue-600" />
				<h4 class="font-medium text-secondary-900">Markdown</h4>
			</div>
			<p class="text-sm text-secondary-600 mb-3">Raw markdown format, perfect for version control and editing</p>
			<Button
				onclick={handleDownloadMarkdown}
				disabled={isDownloading}
				variant="secondary"
				size="sm"
				iconLeft="heroicons:arrow-down-tray"
				class="w-full"
			>
				{isDownloading ? 'Downloading...' : 'Download .md'}
			</Button>
		</div>

		<!-- DOCX Download -->
		<div class="border border-secondary-200 rounded-lg p-4">
			<div class="flex items-center space-x-2 mb-2">
				<Icon icon="heroicons:document" class="w-5 h-5 text-blue-800" />
				<h4 class="font-medium text-secondary-900">Word Document</h4>
			</div>
			<p class="text-sm text-secondary-600 mb-3">Microsoft Word format, ready for submission and collaboration</p>
			<Button
				onclick={handleDownloadDocx}
				disabled={isDownloading}
				variant="secondary"
				size="sm"
				iconLeft="heroicons:arrow-down-tray"
				class="w-full"
			>
				{isDownloading ? 'Converting...' : 'Download .docx'}
			</Button>
		</div>

		<!-- Project Report Download -->
		<div class="border border-secondary-200 rounded-lg p-4">
			<div class="flex items-center space-x-2 mb-2">
				<Icon icon="heroicons:chart-bar" class="w-5 h-5 text-purple-600" />
				<h4 class="font-medium text-secondary-900">Transparency Report</h4>
			</div>
			<p class="text-sm text-secondary-600 mb-3">Transparency report documenting format, research focus, outline, and AI workflow process</p>
			<Button
				onclick={handleDownloadReport}
				disabled={isDownloading}
				variant="secondary"
				size="sm"
				iconLeft="heroicons:arrow-down-tray"
				class="w-full"
			>
				{isDownloading ? 'Generating...' : 'Download DOCX'}
			</Button>
		</div>
	</div>

	{#if !isCompleted}
		<div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
			<div class="flex items-center">
				<Icon icon="heroicons:exclamation-triangle" class="w-5 h-5 text-amber-600 mr-2" />
				<div>
					<p class="text-sm font-medium text-amber-800">Draft in Progress</p>
					<p class="text-sm text-amber-700 mt-1">
						Complete the writing step to mark this draft as finished. Downloads are available at any stage.
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>