<script lang="ts">
    import { onMount } from 'svelte';

    import TextArea from '$lib/components/ui/TextArea.svelte';
	import A from '$lib/components/ui/A.svelte';
	import Label from '$lib/components/ui/Label.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Heading from '$lib/components/ui/Heading.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '@iconify/svelte';

	// i18n
	import { m } from '$lib/paraglide/messages.js';

	// @ts-ignore
	import * as bibtexParse from '@orcid/bibtex-parse-js';

    import type { Citation } from '$lib/stores/drafts';

	// Props
	let { 
		draftId,
		citations = $bindable(),
        uploadedFiles = $bindable(),
		onNextStep,
		onPreviousStep
	}: { 
		draftId: string;
		citations: Citation[];
        uploadedFiles: { id: string; name: string; type: string; size: number }[];
		onNextStep: () => void;
		onPreviousStep: () => void;
	} = $props();
	let selectedCitationId = $state<string | null>(null);
	let showAddCitationForm = $state(false);
	let editingCitationId = $state<string | null>(null);
	let editingCitation = $state({
		title: '',
		authors: [] as string[],
		year: new Date().getFullYear(),
		journal: '',
		volume: '',
		issue: '',
		pages: '',
		type: 'article',
		abstract: '',
		notes: '',
		doi: '',
		url: ''
	});
	let uploadingBibtex = $state(false);
	let selectedCitationsForBatch = $state<Set<string>>(new Set());

	// Pagination state
	let currentPage = $state(1);
	let itemsPerPage = $state(10);

	// Form states
	let newCitation = $state({
		title: '',
		authors: [] as string[],
		year: new Date().getFullYear(),
		journal: '',
		volume: '',
		issue: '',
		pages: '',
		type: 'article' as Citation['type'],
		abstract: '',
		notes: '',
		doi: '',
		url: ''
	});

	// Citation types
	const citationTypes = [
		{ value: 'article', label: m.documents_type_article() },
		{ value: 'book', label: m.documents_type_book() },
		{ value: 'inproceedings', label: m.documents_type_inproceedings() },
		{ value: 'webpage', label: m.documents_type_webpage() },
		{ value: 'misc', label: m.documents_type_misc() }
	];

	// Pagination computed values
	let totalCitations = $derived(() => citations.length);
	let totalPages = $derived(() => Math.ceil(totalCitations() / itemsPerPage));
	let paginatedCitations = $derived(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		return citations.slice(startIndex, endIndex);
	});

	// Validation
	let canProceedToOutline = $derived(() => {
		return citations.length > 0;
	});

	// UUID generation function with fallback for debugging environments
	function generateUUID(): string {
		// Use native crypto.randomUUID() if available (modern browsers/Node.js)
		if (typeof crypto !== 'undefined' && crypto.randomUUID) {
			return crypto.randomUUID();
		}
		
		// Fallback for debugging/development environments
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			const r = Math.random() * 16 | 0;
			const v = c === 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}

	// BibTeX parser using @orcid/bibtex-parse-js library
	function parseBibTeX(bibtexContent: string): Citation[] {
		const citations: Citation[] = [];
		
		try {
			// Parse BibTeX content using the library
			const parsedEntries = bibtexParse.toJSON(bibtexContent);
			
			for (const entry of parsedEntries) {
				// Get entry type and tags
				const entryType = entry.entryType?.toLowerCase() || 'misc';
				const tags = entry.entryTags || {};
				
				// Map BibTeX entry type to our citation type
				let citationType: Citation['type'] = 'misc';
				switch (entryType) {
					case 'article':
						citationType = 'article';
						break;
					case 'book':
					case 'inbook':
					case 'incollection':
						citationType = 'book';
						break;
					case 'inproceedings':
					case 'conference':
						citationType = 'inproceedings';
						break;
					case 'misc':
					case 'online':
					case 'webpage':
						citationType = tags.URL || tags.url ? 'webpage' : 'misc';
						break;
				}
				
				// Parse authors - handle various author field formats
				const authorField = tags.AUTHOR || tags.author || '';
				const authors = authorField 
					? authorField.split(' and ').map((author: string) => author.trim())
					: [];
				
				// Parse year
				const yearField = tags.YEAR || tags.year || '';
				const year = yearField 
					? parseInt(yearField, 10) 
					: new Date().getFullYear();
				
				// Create citation object with proper field mapping
				const citation: Citation = {
					id: generateUUID(),
					title: tags.TITLE || tags.title || 'Untitled',
					authors,
					year,
					journal: tags.JOURNAL || tags.journal || tags.BOOKTITLE || tags.booktitle || '',
					volume: tags.VOLUME || tags.volume || '',
					issue: tags.NUMBER || tags.number || '',
					pages: tags.PAGES || tags.pages || '',
					doi: tags.DOI || tags.doi || '',
					url: tags.URL || tags.url || '',
					type: citationType,
					abstract: tags.ABSTRACT || tags.abstract || '',
					notes: '',
					dateAdded: new Date().toISOString()
				};
				
				citations.push(citation);
			}
		} catch (error) {
			console.error('BibTeX parsing error:', error);
			throw new Error('Failed to parse BibTeX content. Please check the file format.');
		}
		
		return citations;
	}

	function saveDocumentsData() {
		try {
			const documentsData = {
				citations,
				uploadedFiles,
				lastSaved: new Date().toISOString()
			};
			localStorage.setItem(`paperwriter-draft-${draftId}-documents`, JSON.stringify(documentsData));
		} catch (error) {
			console.error('Failed to save documents data:', error);
		}
	}

	function addCitation() {
		if (!newCitation.title?.trim()) return;
		
		// For webpage citations, URL is required
		if (newCitation.type === 'webpage' && !newCitation.url?.trim()) return;

		const citation: Citation = {
			id: generateUUID(),
			title: newCitation.title.trim(),
			authors: newCitation.authors || [],
			year: newCitation.year || new Date().getFullYear(),
			journal: newCitation.journal?.trim(),
			volume: newCitation.volume?.trim(),
			issue: newCitation.issue?.trim(),
			pages: newCitation.pages?.trim(),
			doi: newCitation.doi?.trim(),
			url: newCitation.url?.trim(),
			type: newCitation.type || 'article',
			abstract: newCitation.abstract?.trim(),
			notes: newCitation.notes || '',
			dateAdded: new Date().toISOString()
		};

		citations = [...citations, citation];
		saveDocumentsData();

		// Reset form
		newCitation = {
			title: '',
			authors: [],
			year: new Date().getFullYear(),
			journal: '',
			volume: '',
			issue: '',
			pages: '',
			type: 'article',
			abstract: '',
			notes: '',
			doi: '',
			url: ''
		};
		showAddCitationForm = false;
	}

	function deleteCitation(citationId: string) {
		if (!confirm(m.documents_delete_confirm())) return;

		citations = citations.filter(c => c.id !== citationId);
		saveDocumentsData();

		// Clear selection if deleted citation was selected
		if (selectedCitationId === citationId) {
			selectedCitationId = null;
		}
		
		// Clear editing if deleted citation was being edited
		if (editingCitationId === citationId) {
			editingCitationId = null;
		}
	}

	function startEditingCitation(citationId: string) {
		const citation = citations.find(c => c.id === citationId);
		if (!citation) return;

		// If we're already editing this citation, close the editor
		if (editingCitationId === citationId) {
			cancelEditingCitation();
			return;
		}

		// Set the editing state
		editingCitationId = citationId;
		editingCitation = {
			title: citation.title,
			authors: [...citation.authors],
			year: citation.year,
			journal: citation.journal || '',
			volume: citation.volume || '',
			issue: citation.issue || '',
			pages: citation.pages || '',
			type: citation.type,
			abstract: citation.abstract || '',
			notes: citation.notes,
			doi: citation.doi || '',
			url: citation.url || ''
		};
	}

	function saveEditingCitation() {
		if (!editingCitationId) return;

		const citationIndex = citations.findIndex(c => c.id === editingCitationId);
		if (citationIndex === -1) return;

		// Update the citation
		citations[citationIndex] = {
			...citations[citationIndex],
			title: editingCitation.title.trim(),
			authors: editingCitation.authors,
			year: editingCitation.year,
			journal: editingCitation.journal?.trim(),
			volume: editingCitation.volume?.trim(),
			issue: editingCitation.issue?.trim(),
			pages: editingCitation.pages?.trim(),
			type: editingCitation.type as Citation['type'],
			abstract: editingCitation.abstract?.trim(),
			notes: editingCitation.notes,
			doi: editingCitation.doi?.trim(),
			url: editingCitation.url?.trim()
		};

		saveDocumentsData();
		editingCitationId = null;
	}

	function cancelEditingCitation() {
		editingCitationId = null;
		// Reset the editing citation object to prevent stale data
		editingCitation = {
			title: '',
			authors: [],
			year: new Date().getFullYear(),
			journal: '',
			volume: '',
			issue: '',
			pages: '',
			type: 'article',
			abstract: '',
			notes: '',
			doi: '',
			url: ''
		};
	}

	function updateCitationNotes(citationId: string, notes: string) {
		const citationIndex = citations.findIndex(c => c.id === citationId);
		if (citationIndex !== -1) {
			citations[citationIndex].notes = notes;
			saveDocumentsData();
		}
	}

	function hasUrlOrDoi(citation: Citation): boolean {
		return !!(citation.url?.trim() || citation.doi?.trim());
	}

	function shouldShowUrlDoiWarning(citation: Citation): boolean {
		// For webpages, only URL is needed (DOI not applicable)
		if (citation.type === 'webpage') {
			return !citation.url?.trim();
		}
		// For academic sources, URL or DOI is needed
		return !hasUrlOrDoi(citation);
	}

	function toggleBatchSelection(citationId: string) {
		const newSet = new Set(selectedCitationsForBatch);
		if (newSet.has(citationId)) {
			newSet.delete(citationId);
		} else {
			newSet.add(citationId);
		}
		selectedCitationsForBatch = newSet;
	}

	function deleteBatchCitations() {
		if (selectedCitationsForBatch.size === 0) return;

		const count = selectedCitationsForBatch.size;
		if (!confirm(m.documents_delete_batch_confirm({ count }))) return;

		// Remove selected citations
		citations = citations.filter(c => !selectedCitationsForBatch.has(c.id));
		
		// Clear selections
		selectedCitationsForBatch = new Set();
		
		// Clear other states if needed
		if (selectedCitationId && !citations.find(c => c.id === selectedCitationId)) {
			selectedCitationId = null;
		}
		if (editingCitationId && !citations.find(c => c.id === editingCitationId)) {
			editingCitationId = null;
		}

		saveDocumentsData();
	}

	function selectAllCitations() {
		// Select all citations on current page
		const currentPageIds = paginatedCitations().map(c => c.id);
		const newSelection = new Set(selectedCitationsForBatch);
		currentPageIds.forEach(id => newSelection.add(id));
		selectedCitationsForBatch = newSelection;
	}

	function selectAllCitationsGlobal() {
		// Select all citations across all pages
		selectedCitationsForBatch = new Set(citations.map(c => c.id));
	}

	function deselectAllCitations() {
		selectedCitationsForBatch = new Set();
	}

	function handlePageChange(page: number) {
		currentPage = page;
	}

	// Handle file upload
	function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files) return;
		
		for (const file of Array.from(files)) {
			const fileData = {
				id: generateUUID(),
				name: file.name,
				type: file.type,
				size: file.size,
				url: URL.createObjectURL(file)
			};
			
			uploadedFiles = [...uploadedFiles, fileData];
		}
		
		saveDocumentsData();
		// Clear the input
		input.value = '';
	}
	
	// Remove uploaded file
	function removeUploadedFile(fileId: string) {
		uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
		saveDocumentsData();
	}

	// Reset to first page when citations list changes significantly
	$effect(() => {
		const maxPage = Math.ceil(citations.length / itemsPerPage);
		if (currentPage > maxPage && maxPage > 0) {
			currentPage = maxPage;
		} else if (citations.length === 0) {
			currentPage = 1;
		}
	});

	function handleBibtexUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploadingBibtex = true;
		const reader = new FileReader();
		
		reader.onload = (e) => {
			try {
				const bibtexContent = e.target?.result as string;
				const parsedCitations = parseBibTeX(bibtexContent);
				
				if (parsedCitations.length > 0) {
					citations = [...citations, ...parsedCitations];
					saveDocumentsData();
					alert(m.documents_bibtex_success({ count: parsedCitations.length, filename: file.name }));
				} else {
					alert(m.documents_bibtex_no_citations());
				}
			} catch (error) {
				console.error('Failed to parse BibTeX file:', error);
				alert(m.documents_bibtex_error());
			} finally {
				uploadingBibtex = false;
			}
		};

		reader.readAsText(file);
	}

    function proceedToNextStep() {
		if (!canProceedToOutline()) {
			alert(m.documents_validation_required());
			return;
		}
		saveDocumentsData();
		onNextStep();
	}

	function loadDocumentsData() {
		try {
			// Load documents data
			const savedDocuments = localStorage.getItem(`paperwriter-draft-${draftId}-documents`);
			if (savedDocuments) {
				const documentsData = JSON.parse(savedDocuments);
				citations = documentsData.citations || [];
				uploadedFiles = documentsData.uploadedFiles || [];
			}
		} catch (error) {
			console.error('Failed to load documents data:', error);
		}
	}
    
	// Load saved data on mount
	onMount(() => {
		loadDocumentsData();
	});
</script>

<!-- Documents & Citations Step -->
<div class="space-y-6">
    {#if false }
    <!-- File Upload -->
    <Card>
        {#snippet header()}
            <Heading level="h3" size="lg">Supporting Documents</Heading>
            <p class="text-secondary-600 mt-1">Upload related documents, source codes, figures, or other materials</p>
        {/snippet}
        
        <div class="space-y-4">
            <!-- File Upload Area -->
            <div class="border-2 border-dashed border-secondary-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors relative">
                <input
                    type="file"
                    multiple
                    onchange={handleFileUpload}
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.doc,.docx,.txt,.py,.ipynb,.jpg,.jpeg,.png,.svg,.md"
                />
                <Icon icon="heroicons:cloud-arrow-up" class="w-12 h-12 mx-auto mb-3 text-secondary-400" />
                <p class="text-secondary-600 mb-1">Drop files here or click to upload</p>
                <p class="text-sm text-secondary-500">Supports: PDF, Word, text files, code, notebooks, images</p>
            </div>
            
            <!-- Uploaded Files List -->
            {#if uploadedFiles.length > 0}
                <div class="space-y-2">
                    <h4 class="text-sm font-medium text-secondary-700">Uploaded Files ({uploadedFiles.length})</h4>
                    <div class="space-y-2">
                        {#each uploadedFiles as file}
                            <div class="flex items-center justify-between p-3 bg-secondary-50 rounded-lg border border-secondary-200">
                                <div class="flex items-center space-x-3">
                                    <Icon icon="heroicons:document" class="w-5 h-5 text-secondary-400" />
                                    <div>
                                        <p class="text-sm font-medium text-secondary-900">{file.name}</p>
                                        <p class="text-xs text-secondary-500">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onclick={() => removeUploadedFile(file.id)}
                                    class="p-1 text-secondary-400 hover:text-red-600 transition-colors"
                                    title="Remove file"
                                >
                                    <Icon icon="heroicons:x-mark" class="w-4 h-4" />
                                </button>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </Card>
    {/if}
    <!-- Citation Management -->
    <Card>
        {#snippet header()}
            <div class="flex items-center justify-between">
                <div>
                    <Heading level="h3" size="lg">{m.documents_citations_title()}</Heading>
                    <p class="text-secondary-600 mt-1">{m.documents_citations_subtitle({ count: citations.length })}</p>
                </div>
                <div class="flex space-x-3">
                    <Button
                        onclick={() => showAddCitationForm = true}
                        variant="primary"
                        iconLeft="heroicons:plus"
                    >
                        {m.documents_add_citation()}
                    </Button>
                    <div class="relative">
                        <input
                            type="file"
                            accept=".bib"
                            onchange={handleBibtexUpload}
                            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploadingBibtex}
                        />
                        <Button
                            disabled={uploadingBibtex}
                            variant="secondary"
                            iconLeft={uploadingBibtex ? "heroicons:arrow-path" : "heroicons:document-arrow-up"}
                        >
                            {uploadingBibtex ? m.documents_uploading() : m.documents_upload_bibtex()}
                        </Button>
                    </div>
                </div>
            </div>
        {/snippet}

        <!-- Add Citation Form -->
        {#if showAddCitationForm}
            <div class="mb-6 p-4 bg-secondary-50 rounded-lg border border-secondary-200">
                <Heading level="h4" size="md" class="mb-4">{m.documents_add_new_citation()}</Heading>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2">
                        <Input
                            bind:value={newCitation.title}
                            label={m.documents_title_label()}
                            placeholder={m.documents_title_placeholder()}
                            required
                        />
                    </div>
                    <div class="md:col-span-2">
                        <Input
                            value={newCitation.authors.join(', ')}
                            onkeyup={(e) => {
                                const target = e.target as HTMLInputElement;
                                newCitation.authors = target.value.split(',').map(author => author.trim()).filter(author => author.length > 0);
                            }}
                            label={m.documents_authors_label()}
                            placeholder={m.documents_authors_placeholder()}
                            required
                        />
                    </div>
                    <Input
                        bind:value={newCitation.year}
                        label={m.documents_year_label()}
                        type="number"
                        placeholder="2024"
                    />
                    <div>
                        <Select
                            bind:value={newCitation.type}
                            label={m.documents_type_label()}
                            options={citationTypes}
                            onchange={() => {
                                // Clear irrelevant fields when switching to webpage
                                if (newCitation.type === 'webpage') {
                                    newCitation.journal = '';
                                    newCitation.volume = '';
                                    newCitation.issue = '';
                                    newCitation.pages = '';
                                    newCitation.doi = '';
                                }
                            }}
                        />
                    </div>
                    {#if newCitation.type === 'webpage'}
                        <!-- Webpage-specific fields -->
                        <Input
                            bind:value={newCitation.url}
                            label={m.documents_url_label()}
                            placeholder={m.documents_url_placeholder()}
                            required
                        />
                    {:else}
                        <!-- Academic publication fields -->
                        <Input
                            bind:value={newCitation.journal}
                            label={m.documents_journal_label()}
                            placeholder={m.documents_journal_placeholder()}
                        />
                        <Input
                            bind:value={newCitation.volume}
                            label={m.documents_volume_label()}
                            placeholder={m.documents_volume_placeholder()}
                        />
                        <Input
                            bind:value={newCitation.issue}
                            label={m.documents_issue_label()}
                            placeholder={m.documents_issue_placeholder()}
                        />
                        <Input
                            bind:value={newCitation.pages}
                            label={m.documents_pages_label()}
                            placeholder={m.documents_pages_placeholder()}
                        />
                        <Input
                            bind:value={newCitation.doi}
                            label={m.documents_doi_label()}
                            placeholder={m.documents_doi_placeholder()}
                        />
                        <Input
                            bind:value={newCitation.url}
                            label={m.documents_url_label()}
                            placeholder={m.documents_url_placeholder()}
                        />
                    {/if}
                    
                    <!-- Abstract field (spans full width) -->
                    <div class="md:col-span-2">
                        <Label for="abstract-new-citation">{m.documents_abstract_label()}</Label>
                        <TextArea
                            id="abstract-new-citation"
                            bind:value={newCitation.abstract}
                            placeholder={m.documents_abstract_placeholder()}
                            rows={4}
                        />
                    </div>
                </div>
                <div class="flex justify-end space-x-3 mt-4">
                    <Button onclick={() => showAddCitationForm = false} variant="secondary">{m.common_cancel()}</Button>
                    <Button onclick={addCitation} variant="primary">{m.documents_add_citation()}</Button>
                </div>
            </div>
        {/if}


        <!-- Citations List -->
        {#if citations.length === 0}
            <div class="text-center py-12">
                <Icon icon="heroicons:document-plus" class="w-16 h-16 mx-auto mb-4 text-secondary-400" />
                <h3 class="text-lg font-medium text-secondary-900 mb-2">{m.documents_no_citations_title()}</h3>
                <p class="text-secondary-500 mb-4">{m.documents_no_citations_subtitle()}</p>
                <Button onclick={() => showAddCitationForm = true} variant="primary">
                    {m.documents_add_first_citation()}
                </Button>
            </div>
        {:else}
            <!-- Batch Selection Controls -->
            <div class="flex justify-between items-center mb-4 py-2 border-b border-secondary-100">
                <div class="flex items-center space-x-4">
                    <span class="text-sm text-secondary-600">
                        {m.documents_selected_count({ selected: selectedCitationsForBatch.size, total: citations.length })}
                        {#if totalPages() > 1}
                            • {m.documents_page_info({ current: currentPage, total: totalPages() })}
                        {/if}
                    </span>
                </div>
                
                <!-- Selection Checkboxes -->
                <div class="flex items-center space-x-4">
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={paginatedCitations().length > 0 && paginatedCitations().every(c => selectedCitationsForBatch.has(c.id))}
                            onchange={(e) => {
                                if ((e.target as HTMLInputElement).checked) {
                                    selectAllCitations();
                                } else {
                                    // Deselect current page items
                                    const currentPageIds = paginatedCitations().map(c => c.id);
                                    const newSelection = new Set(selectedCitationsForBatch);
                                    currentPageIds.forEach(id => newSelection.delete(id));
                                    selectedCitationsForBatch = newSelection;
                                }
                            }}
                            class="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                        />
                        <span class="text-sm text-secondary-700">
                            {m.documents_select_page({ count: paginatedCitations().length })}
                        </span>
                    </label>
                    
                    {#if totalPages() > 1}
                        <label class="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={citations.length > 0 && citations.every(c => selectedCitationsForBatch.has(c.id))}
                                onchange={(e) => {
                                    if ((e.target as HTMLInputElement).checked) {
                                        selectAllCitationsGlobal();
                                    } else {
                                        deselectAllCitations();
                                    }
                                }}
                                class="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                            />
                            <span class="text-sm text-secondary-700">
                                {m.documents_select_all({ count: citations.length })}
                            </span>
                        </label>
                    {/if}
                </div>
            </div>

            <!-- Batch Actions Bar (appears when citations are selected) -->
            {#if selectedCitationsForBatch.size > 0}
                <div class="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <Icon icon="heroicons:check-circle" class="w-5 h-5 text-primary-600" />
                            <span class="text-sm font-medium text-primary-900">
                                {m.documents_selected_citations({ count: selectedCitationsForBatch.size, plural: selectedCitationsForBatch.size !== 1 ? 's' : '' })}
                            </span>
                        </div>
                        <div class="flex space-x-3">
                            <Button
                                onclick={deleteBatchCitations}
                                variant="secondary"
                                size="sm"
                                iconLeft="heroicons:trash"
                                class="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                                {m.documents_delete_selected()}
                            </Button>
                        </div>
                    </div>
                </div>
            {/if}
            
            <div class="space-y-4">
                {#each paginatedCitations() as citation}
                    <div class="border border-secondary-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div class="flex items-start space-x-4">
                            <input
                                type="checkbox"
                                checked={selectedCitationsForBatch.has(citation.id)}
                                onchange={() => toggleBatchSelection(citation.id)}
                                class="mt-1 w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                            />
                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <h3 class="font-medium text-secondary-900 mb-1">{citation.title}</h3>
                                        <p class="text-sm text-secondary-600 mb-2">
                                            {citation.authors.join(', ')} ({citation.year})
                                        </p>
                                        {#if citation.journal}
                                            <p class="text-sm text-secondary-500 mb-2">
                                                {@html `<em>${citation.journal}</em>${citation.volume ? `, Vol. ${citation.volume}` : ''}${citation.issue ? `(${citation.issue})` : ''}${citation.pages ? `, pp. ${citation.pages}` : ''}`}
                                            </p>
                                        {/if}

                                        <!-- URL/DOI Warning -->
                                        {#if shouldShowUrlDoiWarning(citation)}
                                            <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                                                <div class="flex">
                                                    <Icon icon="heroicons:exclamation-triangle" class="w-5 h-5 text-amber-600 mt-0.5 mr-2" />
                                                    <div>
                                                        {#if citation.type === 'webpage'}
                                                            <p class="text-sm font-medium text-amber-800">{m.documents_missing_url()}</p>
                                                            <p class="text-sm text-amber-700">{m.documents_missing_url_help()}</p>
                                                        {:else}
                                                            <p class="text-sm font-medium text-amber-800">{m.documents_missing_url_doi()}</p>
                                                            <p class="text-sm text-amber-700">{m.documents_missing_url_doi_help()}</p>
                                                        {/if}
                                                    </div>
                                                </div>
                                            </div>
                                        {/if}

                                        <!-- Citation Links -->
                                        <div class="flex space-x-4 text-sm">
                                            {#if citation.doi}
                                                <A href="https://doi.org/{citation.doi}" external>
                                                    DOI: {citation.doi}
                                                </A>
                                            {/if}
                                            {#if citation.url}
                                                <A href={citation.url} external>
                                                    {m.documents_full_text()}
                                                </A>
                                            {/if}
                                        </div>

                                        <!-- Expandable Details -->
                                        {#if selectedCitationId === citation.id}
                                            <div class="mt-4 space-y-3">
                                                {#if citation.abstract}
                                                    <div>
                                                        <Label for="abstract-{citation.id}">{m.documents_abstract_section()}</Label>
                                                        <div id="abstract-{citation.id}" class="bg-primary-50 p-3 rounded-lg text-sm text-secondary-700">
                                                            {citation.abstract}
                                                        </div>
                                                    </div>
                                                {/if}
                                                
                                                <div>
                                                    <Label for="notes-{citation.id}">{m.documents_notes_label()}</Label>
                                                    <TextArea
                                                        id="notes-{citation.id}"
                                                        value={citation.notes}
                                                        onkeyup={(e) => updateCitationNotes(citation.id, (e.target as HTMLTextAreaElement).value)}
                                                        placeholder={m.documents_notes_placeholder()}
                                                        rows={3}
                                                    />
                                                </div>

                                                {#if citation.summary}
                                                    <div>
                                                        <Label for="summary-{citation.id}">{m.documents_ai_summary()}</Label>
                                                        <div id="summary-{citation.id}" class="bg-secondary-50 p-3 rounded-lg text-sm text-secondary-700">
                                                            {citation.summary}
                                                        </div>
                                                    </div>
                                                {/if}
                                            </div>
                                        {/if}
                                    </div>
                                    <div class="flex space-x-2">
                                        <button
                                            onclick={() => selectedCitationId = selectedCitationId === citation.id ? null : citation.id}
                                            class="p-2 text-secondary-400 hover:text-primary-600 transition-colors"
                                            title="Toggle details"
                                        >
                                            <Icon icon={selectedCitationId === citation.id ? "heroicons:chevron-up" : "heroicons:chevron-down"} class="w-4 h-4" />
                                        </button>
                                        <button
                                            onclick={() => startEditingCitation(citation.id)}
                                            class="p-2 transition-colors"
                                            class:text-primary-600={editingCitationId === citation.id}
                                            class:bg-primary-100={editingCitationId === citation.id}
                                            class:rounded={editingCitationId === citation.id}
                                            class:text-secondary-400={editingCitationId !== citation.id}
                                            class:hover:text-primary-600={editingCitationId !== citation.id}
                                            title={editingCitationId === citation.id ? "Close editor" : "Edit citation"}
                                        >
                                            <Icon icon="heroicons:pencil" class="w-4 h-4" />
                                        </button>
                                        <button
                                            onclick={() => deleteCitation(citation.id)}
                                            class="p-2 text-secondary-400 hover:text-red-600 transition-colors"
                                            title="Delete citation"
                                        >
                                            <Icon icon="heroicons:trash" class="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Inline Edit Citation Form -->
                        {#if editingCitationId === citation.id}
                            <div class="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
                                <Heading level="h4" size="md" class="mb-4">{m.documents_edit_citation()}</Heading>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="md:col-span-2">
                                        <Input
                                            bind:value={editingCitation.title}
                                            label={m.documents_title_label()}
                                            placeholder={m.documents_title_placeholder()}
                                            required
                                        />
                                    </div>
                                    <div class="md:col-span-2">
                                        <Input
                                            value={editingCitation.authors.join(', ')}
                                            onkeyup={(e) => {
                                                const target = e.target as HTMLInputElement;
                                                editingCitation.authors = target.value.split(',').map(author => author.trim()).filter(author => author.length > 0);
                                            }}
                                            label={m.documents_authors_label()}
                                            placeholder={m.documents_authors_placeholder()}
                                            required
                                        />
                                    </div>
                                    <Input
                                        bind:value={editingCitation.year}
                                        label={m.documents_year_label()}
                                        type="number"
                                        placeholder="2024"
                                    />
                                    <div>
                                        <Select
                                            bind:value={editingCitation.type}
                                            label={m.documents_type_label()}
                                            options={citationTypes}
                                            onchange={() => {
                                                // Clear irrelevant fields when switching to webpage
                                                if (editingCitation.type === 'webpage') {
                                                    editingCitation.journal = '';
                                                    editingCitation.volume = '';
                                                    editingCitation.issue = '';
                                                    editingCitation.pages = '';
                                                    editingCitation.doi = '';
                                                }
                                            }}
                                        />
                                    </div>
                                    {#if editingCitation.type === 'webpage'}
                                        <!-- Webpage-specific fields -->
                                        <Input
                                            bind:value={editingCitation.url}
                                            label={m.documents_url_label()}
                                            placeholder={m.documents_url_placeholder()}
                                            required
                                        />
                                    {:else}
                                        <!-- Academic publication fields -->
                                        <Input
                                            bind:value={editingCitation.journal}
                                            label={m.documents_journal_label()}
                                            placeholder={m.documents_journal_placeholder()}
                                        />
                                        <Input
                                            bind:value={editingCitation.volume}
                                            label={m.documents_volume_label()}
                                            placeholder={m.documents_volume_placeholder()}
                                        />
                                        <Input
                                            bind:value={editingCitation.issue}
                                            label={m.documents_issue_label()}
                                            placeholder={m.documents_issue_placeholder()}
                                        />
                                        <Input
                                            bind:value={editingCitation.pages}
                                            label={m.documents_pages_label()}
                                            placeholder={m.documents_pages_placeholder()}
                                        />
                                        <Input
                                            bind:value={editingCitation.doi}
                                            label={m.documents_doi_label()}
                                            placeholder={m.documents_doi_placeholder()}
                                        />
                                        <Input
                                            bind:value={editingCitation.url}
                                            label={m.documents_url_label()}
                                            placeholder={m.documents_url_placeholder()}
                                        />
                                    {/if}
                                    
                                    <!-- Abstract field (spans full width) -->
                                    <div class="md:col-span-2">
                                        <Label for="abstract-editing-citation">{m.documents_abstract_label()}</Label>
                                        <TextArea
                                            id="abstract-editing-citation"
                                            bind:value={editingCitation.abstract}
                                            placeholder={m.documents_abstract_placeholder()}
                                            rows={4}
                                        />
                                    </div>
                                </div>
                                <div class="flex justify-end space-x-3 mt-4">
                                    <Button onclick={cancelEditingCitation} variant="secondary">{m.common_cancel()}</Button>
                                    <Button onclick={saveEditingCitation} variant="primary">{m.documents_save_changes()}</Button>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
            
            <!-- Pagination -->
            {#if totalPages() > 1}
                <div class="mt-6">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalCitations()}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                    />
                </div>
            {/if}
        {/if}
    </Card>

    <!-- Navigation -->
    {#if !canProceedToOutline()}
        <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div class="flex items-center">
                <Icon icon="heroicons:exclamation-triangle" class="w-5 h-5 text-amber-600 mr-2" />
                <span class="text-sm font-medium text-amber-800">{m.documents_citation_required()}</span>
            </div>
            <p class="text-sm text-amber-700 mt-1">
                {m.documents_citation_required_help()}
            </p>
        </div>
    {/if}
    <div class="flex justify-between">
        <Button
            onclick={onPreviousStep}
            variant="secondary"
            iconLeft="heroicons:arrow-left"
        >
            {m.documents_previous_step()}
        </Button>
        <Button
            onclick={proceedToNextStep}
            disabled={!canProceedToOutline()}
            variant="primary"
            iconRight="heroicons:arrow-right"
        >
            {m.documents_next_step()}
        </Button>
    </div>
</div>