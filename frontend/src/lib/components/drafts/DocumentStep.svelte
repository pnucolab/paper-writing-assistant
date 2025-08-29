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
	import FileDrop from '$lib/components/ui/FileDrop.svelte';
	import ArticleSearchModal from './ArticleSearchModal.svelte';

	// i18n
	import { m } from '$lib/paraglide/messages.js';

	// @ts-ignore
	import * as bibtexParse from '@orcid/bibtex-parse-js';
	
	// LLM and file processing
	import { LLMClient, getLLMSettings } from '$lib/utils/llm';
	import { getDocumentSummaryPrompt, getImageSummaryPrompt, getCodeSummaryPrompt } from '$lib/utils/prompts';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { generateUUID } from '$lib/utils/uuid';

    import type { Citation } from '$lib/stores/drafts';

	// Props
	let { 
		draftId,
		citations = $bindable(),
        uploadedFiles = $bindable(),
		figureFiles = $bindable(),
		onNextStep,
		onPreviousStep
	}: { 
		draftId: string;
		citations: Citation[];
        uploadedFiles: { id: string; name: string; type: string; size: number; url?: string; summary?: string; isProcessing?: boolean }[];
        figureFiles: { id: string; name: string; type: string; size: number; url?: string; thumbnail?: string; summary?: string; isProcessing?: boolean }[];
		onNextStep: () => void;
		onPreviousStep: () => void;
	} = $props();
	let selectedCitationId = $state<string | null>(null);
	let showAddCitationForm = $state(false);
	let showArticleSearchModal = $state(false);
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

	// Check if any files are being processed
	const isProcessing = $derived(() => {
		const uploadProcessing = uploadedFiles.some(file => file.isProcessing);
		const figureProcessing = figureFiles.some(file => file.isProcessing);
		return uploadProcessing || figureProcessing;
	});

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

	// Validation - require at least one material (citation, figure, or supplementary data)
	let canProceedToOutline = $derived(() => {
		return citations.length > 0 || figureFiles.length > 0 || uploadedFiles.length > 0;
	});


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
				figureFiles,
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

	// Handle citation from article search
	function handleAddCitationFromSearch(citation: Citation) {
		citations = [...citations, citation];
		saveDocumentsData();
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

	// Handle file selection from FileDrop component for figures
	async function handleFigureSelection(file: File) {
		const fileId = generateUUID();
		
		// Create thumbnail for localStorage storage
		const thumbnail = await createThumbnail(file);
		
		const fileData = {
			id: fileId,
			name: file.name,
			type: file.type,
			size: file.size,
			url: URL.createObjectURL(file),
			thumbnail: thumbnail, // Store base64 thumbnail for persistence
			isProcessing: true,
			summary: undefined
		};
		
		figureFiles = [...figureFiles, fileData];
		saveDocumentsData();
		
		// Process the file asynchronously
		processFileWithLLM(file, fileId, 'figure');
	}

	// Handle file selection from FileDrop component for supplementary data
	function handleFileSelection(file: File) {
		const fileData = {
			id: generateUUID(),
			name: file.name,
			type: file.type,
			size: file.size,
			url: URL.createObjectURL(file),
			isProcessing: true,
			summary: undefined
		};
		
		uploadedFiles = [...uploadedFiles, fileData];
		saveDocumentsData();
		
		// Process the file asynchronously
		processFileWithLLM(file, fileData.id, 'document');
	}
	
	// Process file content and generate summary using LLM
	async function processFileWithLLM(file: File, fileId: string, fileCategory: 'figure' | 'document' = 'document') {
		try {
			// Find the file in the appropriate array
			const fileList = fileCategory === 'figure' ? figureFiles : uploadedFiles;
			const fileIndex = fileList.findIndex(f => f.id === fileId);
			if (fileIndex === -1) return;
			
			// Get LLM settings
			const llmConfig = getLLMSettings();
			const llmClient = new LLMClient(llmConfig);
			
			let prompt: string;
			let systemPrompt = '';
			
			// Handle different file types
			if (file.type.startsWith('image/')) {
				// For images, use vision-capable LLM
				const imageBase64 = await fileToBase64(file);
				const prompt = getImageSummaryPrompt(file.name, getLocale());
				
				// Call vision-enabled LLM
				const response = await llmClient.visionCompletion(prompt, imageBase64);
				
				// Update the file data with summary in the correct array
				if (fileCategory === 'figure') {
					figureFiles[fileIndex] = {
						...figureFiles[fileIndex],
						isProcessing: false,
						summary: response.content
					};
				} else {
					uploadedFiles[fileIndex] = {
						...uploadedFiles[fileIndex],
						isProcessing: false,
						summary: response.content
					};
				}
				
				saveDocumentsData();
				return;
			}
			
			// Read text-based files
			const content = await readFileContent(file);
			
			// Determine file type and create appropriate prompt
			if (isCodeFile(file.name)) {
				prompt = getCodeSummaryPrompt(file.name, file.type, content, getLocale());
			} else {
				prompt = getDocumentSummaryPrompt(file.name, file.type, content, getLocale());
			}
			
			// Call LLM for summarization
			const response = await llmClient.chatCompletion(systemPrompt, prompt);
			
			// Update the file data with summary in the correct array
			if (fileCategory === 'figure') {
				figureFiles[fileIndex] = {
					...figureFiles[fileIndex],
					isProcessing: false,
					summary: response.content
				};
			} else {
				uploadedFiles[fileIndex] = {
					...uploadedFiles[fileIndex],
					isProcessing: false,
					summary: response.content
				};
			}
			
		} catch (error) {
			console.error('Error processing file with LLM:', error);
			
			// Update file with specific error message
			const fileList = fileCategory === 'figure' ? figureFiles : uploadedFiles;
			const fileIndex = fileList.findIndex(f => f.id === fileId);
			if (fileIndex !== -1) {
				let errorMessage = 'Failed to process file. Please check your LLM settings.';
				
				// Provide more specific error messages for common issues
				if (error instanceof Error) {
					if (error.message.includes('Failed to convert PDF')) {
						errorMessage = 'Failed to extract text from PDF. The file might be corrupted or password-protected.';
					} else if (error.message.includes('Failed to convert DOCX')) {
						errorMessage = 'Failed to extract text from Word document. The file might be corrupted or in an unsupported format.';
					} else if (error.message.includes('Settings')) {
						errorMessage = error.message; // Use the LLM settings error message directly
					}
				}
				
				if (fileCategory === 'figure') {
					figureFiles[fileIndex] = {
						...figureFiles[fileIndex],
						isProcessing: false,
						summary: errorMessage
					};
				} else {
					uploadedFiles[fileIndex] = {
						...uploadedFiles[fileIndex],
						isProcessing: false,
						summary: errorMessage
					};
				}
			}
		}
		
		saveDocumentsData();
	}
	
	// Helper function to read file content as text
	async function readFileContent(file: File): Promise<string> {
		const fileName = file.name.toLowerCase();
		
		// Handle PDF files
		if (fileName.endsWith('.pdf')) {
			return await convertPdfToText(file);
		}
		
		// Handle DOCX files
		if (fileName.endsWith('.docx')) {
			return await convertDocxToText(file);
		}
		
		// Handle regular text files
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => resolve(e.target?.result as string);
			reader.onerror = (e) => reject(e);
			reader.readAsText(file);
		});
	}
	
	// Convert PDF to text using pdf.js
	async function convertPdfToText(file: File): Promise<string> {
		try {
			// Dynamic import to avoid bundling issues
			const pdfjs = await import('pdfjs-dist');
			
			// Set up worker
			pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
			
			// Convert file to ArrayBuffer
			const arrayBuffer = await file.arrayBuffer();
			
			// Load the PDF document
			const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
			let textContent = '';
			
			// Extract text from each page
			for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
				const page = await pdf.getPage(pageNum);
				const content = await page.getTextContent();
				
				// Combine text items into strings
				const pageText = content.items
					.map((item: any) => item.str)
					.join(' ');
				
				textContent += pageText + '\n\n';
			}
			
			return textContent.trim();
		} catch (error) {
			console.error('PDF conversion error:', error);
			throw new Error(`Failed to convert PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
	
	// Convert DOCX to text using mammoth.js
	async function convertDocxToText(file: File): Promise<string> {
		try {
			// Use mammoth.js for direct text extraction
			const mammoth = await import('mammoth');
			
			// Extract raw text directly from DOCX
			const result = await mammoth.extractRawText({
				arrayBuffer: await file.arrayBuffer()
			});
			
			return result.value;
		} catch (error) {
			console.error('DOCX conversion error:', error);
			throw new Error(`Failed to convert DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
	
	// Helper function to convert file to base64 for vision models
	function fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => resolve(e.target?.result as string);
			reader.onerror = (e) => reject(e);
			reader.readAsDataURL(file);
		});
	}

	// Helper function to create thumbnail from image file
	function createThumbnail(file: File, maxWidth: number = 100, maxHeight: number = 100): Promise<string> {
		return new Promise((resolve, reject) => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			const img = new Image();
			
			img.onload = () => {
				// Calculate thumbnail dimensions maintaining aspect ratio
				const { width, height } = img;
				const aspectRatio = width / height;
				
				let thumbWidth = maxWidth;
				let thumbHeight = maxHeight;
				
				if (aspectRatio > 1) {
					thumbHeight = maxWidth / aspectRatio;
				} else {
					thumbWidth = maxHeight * aspectRatio;
				}
				
				canvas.width = thumbWidth;
				canvas.height = thumbHeight;
				
				// Draw and convert to base64
				ctx?.drawImage(img, 0, 0, thumbWidth, thumbHeight);
				resolve(canvas.toDataURL('image/jpeg', 0.8));
			};
			
			img.onerror = reject;
			img.src = URL.createObjectURL(file);
		});
	}
	
	// Helper function to determine if file is a code file
	function isCodeFile(fileName: string): boolean {
		const codeExtensions = ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h', '.css', '.html', '.sql', '.r', '.m', '.ipynb'];
		return codeExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
	}
	
	// Remove selected figure file
	function removeFigureFile(fileId: string) {
		figureFiles = figureFiles.filter(f => f.id !== fileId);
		saveDocumentsData();
	}

	// Remove selected supplementary file
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
		if (isProcessing()) {
			alert(m.documents_processing_warning());
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
				figureFiles = documentsData.figureFiles || [];
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
    <!-- Figures -->
    <Card>
        {#snippet header()}
            <Heading level="h3" size="lg">{m.documents_figures_title()}</Heading>
            <p class="text-secondary-600 mt-1">{m.documents_figures_description()}</p>
        {/snippet}
        
        <div class="space-y-4">
            <!-- Figure Selection Area -->
            <FileDrop
                acceptedTypes={['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff']}
                multiple={true}
                onFileSelect={handleFigureSelection}
                formatText="JPG, PNG, SVG, GIF and other image formats"
            />
            
            <!-- Selected Figures List -->
            {#if figureFiles.length > 0}
                <Card>
                    {#snippet header()}
                        <Heading level="h4" size="md">{m.documents_selected_files({ count: figureFiles.length })}</Heading>
                    {/snippet}
                    
                    <div class="space-y-3">
                        {#each figureFiles as file}
                            <div class="p-4 bg-secondary-50 rounded-lg border border-secondary-200">
                                <div class="flex items-start justify-between mb-3">
                                    <div class="flex items-center space-x-3">
                                        <Icon 
                                            icon="heroicons:photo" 
                                            class="w-5 h-5 text-secondary-400" 
                                        />
                                        <div>
                                            <p class="text-sm font-medium text-secondary-900">{file.name}</p>
                                            <p class="text-xs text-secondary-500">
                                                {m.documents_file_size({ size: (file.size / 1024 / 1024).toFixed(2) })}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onclick={() => removeFigureFile(file.id)}
                                        class="p-1 text-secondary-400 hover:text-red-600 rounded transition-colors"
                                        title={m.documents_remove_file()}
                                    >
                                        <Icon icon="heroicons:x-mark" class="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <!-- Figure Summary with Thumbnail -->
                                <div class="mt-3 p-3 bg-white rounded-lg border border-secondary-100">
                                    {#if file.isProcessing}
                                        <div class="flex items-center space-x-2 text-sm text-secondary-600">
                                            <Icon icon="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                                            <span>{m.documents_analyzing_file()}</span>
                                        </div>
                                    {:else if file.summary && file.thumbnail}
                                        <div class="flex space-x-3">
                                            <!-- Thumbnail stored in localStorage -->
                                            <div class="flex-shrink-0">
                                                <img 
                                                    src={file.thumbnail} 
                                                    alt={file.name}
                                                    class="w-16 h-16 object-cover rounded border border-secondary-200"
                                                    loading="lazy"
                                                />
                                            </div>
                                            <div class="flex-1 text-sm text-secondary-700">
                                                <p class="font-medium text-secondary-900 mb-1">{m.documents_summary_label()}</p>
                                                <p>{file.summary}</p>
                                            </div>
                                        </div>
                                    {:else}
                                        <p class="text-sm text-secondary-500 italic">{m.documents_no_summary()}</p>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </Card>
            {/if}
        </div>
    </Card>

    <!-- Supplementary Data -->
    <Card>
        {#snippet header()}
            <Heading level="h3" size="lg">{m.documents_supporting_title()}</Heading>
            <p class="text-secondary-600 mt-1">{m.documents_supporting_description()}</p>
        {/snippet}
        
        <div class="space-y-4">
            <!-- File Selection Area -->
            <FileDrop
                acceptedTypes={['.pdf', '.doc', '.docx', '.txt', '.py', '.ipynb', '.md', '.csv', '.json', '.xml', '.yaml', '.yml']}
                multiple={true}
                onFileSelect={handleFileSelection}
                formatText="PDF, Word documents, text files, code, data files, etc."
            />
            
            <!-- Selected Files List -->
            {#if uploadedFiles.length > 0}
                <Card>
                    {#snippet header()}
                        <Heading level="h4" size="md">{m.documents_selected_files({ count: uploadedFiles.length })}</Heading>
                    {/snippet}
                    
                    <div class="space-y-3">
                        {#each uploadedFiles as file}
                            <div class="p-4 bg-secondary-50 rounded-lg border border-secondary-200">
                                <div class="flex items-start justify-between mb-3">
                                    <div class="flex items-center space-x-3">
                                        <Icon 
                                            icon={file.type.startsWith('image/') ? 'heroicons:photo' : isCodeFile(file.name) ? 'heroicons:code-bracket' : 'heroicons:document'} 
                                            class="w-5 h-5 text-secondary-400" 
                                        />
                                        <div>
                                            <p class="text-sm font-medium text-secondary-900">{file.name}</p>
                                            <p class="text-xs text-secondary-500">
                                                {m.documents_file_size({ size: (file.size / 1024 / 1024).toFixed(2) })}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onclick={() => removeUploadedFile(file.id)}
                                        class="p-1 text-secondary-400 hover:text-red-600 rounded transition-colors"
                                        title={m.documents_remove_file()}
                                    >
                                        <Icon icon="heroicons:x-mark" class="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <!-- File Summary -->
                                <div class="mt-3 p-3 bg-white rounded-lg border border-secondary-100">
                                    {#if file.isProcessing}
                                        <div class="flex items-center space-x-2 text-sm text-secondary-600">
                                            <Icon icon="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                                            <span>{m.documents_analyzing_file()}</span>
                                        </div>
                                    {:else if file.summary}
                                        <div class="text-sm text-secondary-700">
                                            <p class="font-medium text-secondary-900 mb-1">{m.documents_summary_label()}</p>
                                            <p>{file.summary}</p>
                                        </div>
                                    {:else}
                                        <p class="text-sm text-secondary-500 italic">{m.documents_no_summary()}</p>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </Card>
            {/if}
        </div>
    </Card>

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
                    <Button
                        onclick={() => showArticleSearchModal = true}
                        variant="primary"
                    >
                        <Icon icon="tabler:search" class="w-4 h-4 mr-2" />
                        {m.documents_search_articles()}
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
                            variant="primary"
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
                    <div class="md:col-span-2 space-y-2">
                        <Label for="citation-title" required>{m.documents_title_label()}</Label>
                        <Input
                            id="citation-title"
                            bind:value={newCitation.title}
                            placeholder={m.documents_title_placeholder()}
                            required
                        />
                    </div>
                    <div class="md:col-span-2 space-y-2">
                        <Label for="citation-authors" required>{m.documents_authors_label()}</Label>
                        <Input
                            id="citation-authors"
                            value={newCitation.authors.join(', ')}
                            onkeyup={(e) => {
                                const target = e.target as HTMLInputElement;
                                newCitation.authors = target.value.split(',').map(author => author.trim()).filter(author => author.length > 0);
                            }}
                            placeholder={m.documents_authors_placeholder()}
                            required
                        />
                    </div>
                    <div class="space-y-2">
                        <Label for="citation-year">{m.documents_year_label()}</Label>
                        <Input
                            id="citation-year"
                            bind:value={newCitation.year}
                            type="number"
                            placeholder="2024"
                        />
                    </div>
                    <div class="space-y-2">
                        <Label for="citation-type">{m.documents_type_label()}</Label>
                        <Select
                            id="citation-type"
                            bind:value={newCitation.type}
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
                        <div class="md:col-span-2 space-y-2">
                            <Label for="citation-webpage-url" required>{m.documents_url_label()}</Label>
                            <Input
                                id="citation-webpage-url"
                                bind:value={newCitation.url}
                                placeholder={m.documents_url_placeholder()}
                                required
                            />
                        </div>
                    {:else}
                        <!-- Academic publication fields -->
                        <div class="space-y-2">
                            <Label for="citation-journal">{m.documents_journal_label()}</Label>
                            <Input
                                id="citation-journal"
                                bind:value={newCitation.journal}
                                placeholder={m.documents_journal_placeholder()}
                            />
                        </div>
                        <div class="space-y-2">
                            <Label for="citation-volume">{m.documents_volume_label()}</Label>
                            <Input
                                id="citation-volume"
                                bind:value={newCitation.volume}
                                placeholder={m.documents_volume_placeholder()}
                            />
                        </div>
                        <div class="space-y-2">
                            <Label for="citation-issue">{m.documents_issue_label()}</Label>
                            <Input
                                id="citation-issue"
                                bind:value={newCitation.issue}
                                placeholder={m.documents_issue_placeholder()}
                            />
                        </div>
                        <div class="space-y-2">
                            <Label for="citation-pages">{m.documents_pages_label()}</Label>
                            <Input
                                id="citation-pages"
                                bind:value={newCitation.pages}
                                placeholder={m.documents_pages_placeholder()}
                            />
                        </div>
                        <div class="space-y-2">
                            <Label for="citation-doi">{m.documents_doi_label()}</Label>
                            <Input
                                id="citation-doi"
                                bind:value={newCitation.doi}
                                placeholder={m.documents_doi_placeholder()}
                            />
                        </div>
                        <div class="space-y-2">
                            <Label for="citation-url">{m.documents_url_label()}</Label>
                            <Input
                                id="citation-url"
                                bind:value={newCitation.url}
                                placeholder={m.documents_url_placeholder()}
                            />
                        </div>
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
                                    <div class="md:col-span-2 space-y-2">
                                        <Label for="edit-citation-title" required>{m.documents_title_label()}</Label>
                                        <Input
                                            id="edit-citation-title"
                                            bind:value={editingCitation.title}
                                            placeholder={m.documents_title_placeholder()}
                                            required
                                        />
                                    </div>
                                    <div class="md:col-span-2 space-y-2">
                                        <Label for="edit-citation-authors" required>{m.documents_authors_label()}</Label>
                                        <Input
                                            id="edit-citation-authors"
                                            value={editingCitation.authors.join(', ')}
                                            onkeyup={(e) => {
                                                const target = e.target as HTMLInputElement;
                                                editingCitation.authors = target.value.split(',').map(author => author.trim()).filter(author => author.length > 0);
                                            }}
                                            placeholder={m.documents_authors_placeholder()}
                                            required
                                        />
                                    </div>
                                    <div class="space-y-2">
                                        <Label for="edit-citation-year">{m.documents_year_label()}</Label>
                                        <Input
                                            id="edit-citation-year"
                                            bind:value={editingCitation.year}
                                            type="number"
                                            placeholder="2024"
                                        />
                                    </div>
                                    <div class="space-y-2">
                                        <Label for="edit-citation-type">{m.documents_type_label()}</Label>
                                        <Select
                                            id="edit-citation-type"
                                            bind:value={editingCitation.type}
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
                                        <div class="md:col-span-2 space-y-2">
                                            <Label for="edit-citation-webpage-url" required>{m.documents_url_label()}</Label>
                                            <Input
                                                id="edit-citation-webpage-url"
                                                bind:value={editingCitation.url}
                                                placeholder={m.documents_url_placeholder()}
                                                required
                                            />
                                        </div>
                                    {:else}
                                        <!-- Academic publication fields -->
                                        <div class="space-y-2">
                                            <Label for="edit-citation-journal">{m.documents_journal_label()}</Label>
                                            <Input
                                                id="edit-citation-journal"
                                                bind:value={editingCitation.journal}
                                                placeholder={m.documents_journal_placeholder()}
                                            />
                                        </div>
                                        <div class="space-y-2">
                                            <Label for="edit-citation-volume">{m.documents_volume_label()}</Label>
                                            <Input
                                                id="edit-citation-volume"
                                                bind:value={editingCitation.volume}
                                                placeholder={m.documents_volume_placeholder()}
                                            />
                                        </div>
                                        <div class="space-y-2">
                                            <Label for="edit-citation-issue">{m.documents_issue_label()}</Label>
                                            <Input
                                                id="edit-citation-issue"
                                                bind:value={editingCitation.issue}
                                                placeholder={m.documents_issue_placeholder()}
                                            />
                                        </div>
                                        <div class="space-y-2">
                                            <Label for="edit-citation-pages">{m.documents_pages_label()}</Label>
                                            <Input
                                                id="edit-citation-pages"
                                                bind:value={editingCitation.pages}
                                                placeholder={m.documents_pages_placeholder()}
                                            />
                                        </div>
                                        <div class="space-y-2">
                                            <Label for="edit-citation-doi">{m.documents_doi_label()}</Label>
                                            <Input
                                                id="edit-citation-doi"
                                                bind:value={editingCitation.doi}
                                                placeholder={m.documents_doi_placeholder()}
                                            />
                                        </div>
                                        <div class="space-y-2">
                                            <Label for="edit-citation-url">{m.documents_url_label()}</Label>
                                            <Input
                                                id="edit-citation-url"
                                                bind:value={editingCitation.url}
                                                placeholder={m.documents_url_placeholder()}
                                            />
                                        </div>
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
            disabled={!canProceedToOutline() || isProcessing()}
            variant="primary"
            iconRight="heroicons:arrow-right"
        >
            {m.documents_next_step()}
        </Button>
    </div>
</div>

<!-- Article Search Modal -->
<ArticleSearchModal 
	show={showArticleSearchModal}
	onClose={() => showArticleSearchModal = false}
	onAddCitation={handleAddCitationFromSearch}
/>