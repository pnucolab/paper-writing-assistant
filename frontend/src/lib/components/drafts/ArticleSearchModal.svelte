<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Label from '$lib/components/ui/Label.svelte';
	import Icon from '@iconify/svelte';
	import { PubMedClient, type SummaryEntry } from '$lib/utils/pubmed';
	import type { Citation } from '$lib/stores/drafts';
	import { generateUUID } from '$lib/utils/uuid';
	import * as m from '$lib/paraglide/messages.js';

	// Props
	let {
		show = false,
		onClose = () => {},
		onAddCitation = (citation: Citation) => {}
	}: {
		show: boolean;
		onClose: () => void;
		onAddCitation: (citation: Citation) => void;
	} = $props();

	// Search state
	let searchTerm = $state('');
	let sortBy = $state<"most+recent" | "pub+date" | "relevance" | "author" | "journal" | "title">('relevance');
	let minDate = $state('');
	let maxDate = $state('');
	let currentPage = $state(1);
	let itemsPerPage = 10;
	let showFilters = $state(false);

	// Results state
	let totalCount = $state(0);
	let searchResults = $state<SummaryEntry[]>([]);
	let isSearching = $state(false);
	let addingArticleIds = $state<Set<string>>(new Set());
	let hasSearched = $state(false);

	// Detail modal state
	let showDetailModal = $state(false);
	let selectedArticle = $state<SummaryEntry | null>(null);
	let articleDetail = $state<any>(null);
	let isLoadingDetail = $state(false);

	// PubMed client
	let pubmedClient: PubMedClient;

	onMount(() => {
		pubmedClient = new PubMedClient();
	});

	// Computed values  
	// NCBI limits retstart to 9999, so max accessible results = 10000
	let maxAccessibleResults = $derived(() => Math.min(totalCount, 10000));
	let totalPages = $derived(() => Math.ceil(maxAccessibleResults() / itemsPerPage));
	let retstart = $derived((currentPage - 1) * itemsPerPage);
	let isAtMaxLimit = $derived(() => retstart >= 9999);

	// Search function
	async function performSearch() {
		if (!searchTerm.trim()) return;

		isSearching = true;
		hasSearched = true;
		try {
			const searchOptions = {
				term: searchTerm,
				retmax: itemsPerPage,
				retstart: retstart,
				sort: sortBy,
				...(minDate && { mindate: minDate.replace(/-/g, '/') }),
				...(maxDate && { maxdate: maxDate.replace(/-/g, '/') }),
				datetype: 'pdat' as const
			};

			// Get PMIDs
			const searchResult = await pubmedClient.esearch(searchOptions);
			totalCount = searchResult.count;

			// Get summaries
			if (searchResult.pmids.length > 0) {
				searchResults = await pubmedClient.esummary(searchResult.pmids);
			} else {
				searchResults = [];
			}
		} catch (error) {
			console.error('Search failed:', error);
			searchResults = [];
			totalCount = 0;
		}
		isSearching = false;
	}

	// Add article to citations
	async function addArticle(article: SummaryEntry) {
		if (addingArticleIds.has(article.pmid)) return;

		addingArticleIds = new Set([...addingArticleIds, article.pmid]);
		try {
			// Get full article data with abstract
			const xmlData = await pubmedClient.efetchXml([article.pmid]);
			
			// Parse XML to extract abstract
			const parser = new DOMParser();
			const doc = parser.parseFromString(xmlData, 'text/xml');
			
			// Extract abstract
			let abstract = '';
			const abstractElement = doc.querySelector('AbstractText');
			if (abstractElement) {
				abstract = abstractElement.textContent || '';
			}

			// Extract volume and issue from XML
			let volume = '';
			let issue = '';
			const volumeElement = doc.querySelector('Volume');
			const issueElement = doc.querySelector('Issue');
			if (volumeElement) {
				volume = volumeElement.textContent || '';
			}
			if (issueElement) {
				issue = issueElement.textContent || '';
			}

			// Extract pages
			let pages = '';
			const paginationElement = doc.querySelector('Pagination MedlinePgn');
			if (paginationElement) {
				pages = paginationElement.textContent || '';
			}

			// Create citation object
			const citation: Citation = {
				id: generateUUID(),
				title: article.title || '',
				authors: article.authors || [],
				year: article.pubdate ? new Date(article.pubdate).getFullYear() : new Date().getFullYear(),
				journal: article.journal || '',
				volume: volume,
				issue: issue,
				pages: pages,
				doi: article.doi || '',
				abstract: abstract,
				url: article.doi ? `https://doi.org/${article.doi}` : `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
				type: 'article',
				notes: '',
				dateAdded: new Date().toISOString()
			};

			onAddCitation(citation);
		} catch (error) {
			console.error('Failed to add article:', error);
		} finally {
			addingArticleIds = new Set([...addingArticleIds].filter(id => id !== article.pmid));
		}
	}

	// Handle search form submission
	function handleSearch(event: Event) {
		event.preventDefault();
		currentPage = 1;
		performSearch();
	}

	// Handle page change
	function handlePageChange(page: number) {
		currentPage = page;
		performSearch();
	}

	// Show article details
	async function showArticleDetail(article: SummaryEntry) {
		selectedArticle = article;
		showDetailModal = true;
		isLoadingDetail = true;
		articleDetail = null;

		try {
			// Get full article data with abstract
			const xmlData = await pubmedClient.efetchXml([article.pmid]);
			
			// Parse XML to extract detailed information
			const parser = new DOMParser();
			const doc = parser.parseFromString(xmlData, 'text/xml');
			
			// Extract abstract
			let abstract = '';
			const abstractElement = doc.querySelector('AbstractText');
			if (abstractElement) {
				abstract = abstractElement.textContent || '';
			}

			// Extract volume and issue from XML
			let volume = '';
			let issue = '';
			const volumeElement = doc.querySelector('Volume');
			const issueElement = doc.querySelector('Issue');
			if (volumeElement) {
				volume = volumeElement.textContent || '';
			}
			if (issueElement) {
				issue = issueElement.textContent || '';
			}

			// Extract pages
			let pages = '';
			const paginationElement = doc.querySelector('Pagination MedlinePgn');
			if (paginationElement) {
				pages = paginationElement.textContent || '';
			}

			// Extract keywords
			let keywords: string[] = [];
			const keywordElements = doc.querySelectorAll('Keyword');
			keywords = Array.from(keywordElements).map(el => el.textContent || '');

			// Extract publication type
			let publicationTypes: string[] = [];
			const pubTypeElements = doc.querySelectorAll('PublicationType');
			publicationTypes = Array.from(pubTypeElements).map(el => el.textContent || '');

			articleDetail = {
				...article,
				abstract,
				volume,
				issue,
				pages,
				keywords,
				publicationTypes,
				xmlData
			};
		} catch (error) {
			console.error('Failed to fetch article details:', error);
			articleDetail = {
				...article,
				abstract: 'Failed to load abstract',
				keywords: [],
				publicationTypes: []
			};
		}
		isLoadingDetail = false;
	}


	// Reset search when modal is closed
	$effect(() => {
		if (!show) {
			searchTerm = '';
			searchResults = [];
			totalCount = 0;
			currentPage = 1;
			addingArticleIds = new Set();
			showFilters = false;
			sortBy = 'relevance';
			minDate = '';
			maxDate = '';
			hasSearched = false;
		}
	});
</script>

<Modal 
	{show} 
	{onClose} 
	title={m.article_search_modal_title()}
	size="4xl"
	maxHeight="95vh"
>
	{#snippet children()}
		<!-- Search Form -->
		<form onsubmit={handleSearch} class="space-y-4 mb-6">
			<div class="grid grid-cols-1 gap-4">
				<div class="space-y-2">
					<Label for="search-terms" required>{m.article_search_terms_label()}</Label>
					<div class="flex space-x-3">
						<Input
							id="search-terms"
							bind:value={searchTerm}
							placeholder={m.article_search_terms_placeholder()}
							required
							class="w-full flex-1"
						/>
						<Button type="submit" disabled={isSearching || !searchTerm.trim()}>
							{#if isSearching}
								<Icon icon="tabler:loader-2" class="w-4 h-4 mr-2 animate-spin" />
								{m.article_search_searching()}
							{:else}
								<Icon icon="tabler:search" class="w-4 h-4 mr-2" />
								{m.article_search_button()}
							{/if}
						</Button>
					</div>
				</div>
				
				<!-- Filters Toggle -->
				<div class="flex items-center justify-between">
					<button
						type="button"
						onclick={() => showFilters = !showFilters}
						class="flex items-center text-sm text-secondary-600 hover:text-secondary-900 transition-colors"
					>
						<Icon icon={showFilters ? "tabler:chevron-down" : "tabler:chevron-right"} class="w-4 h-4 mr-1" />
						{m.article_search_advanced_filters()}
					</button>
					
					{#if sortBy !== 'relevance' || minDate || maxDate}
						<span class="text-xs text-secondary-500 bg-secondary-100 px-2 py-1 rounded-full">
							{m.article_search_filters_applied()}
						</span>
					{/if}
				</div>
				
				<!-- Collapsible Filters -->
				{#if showFilters}
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-secondary-50 rounded-lg border border-secondary-200">
						<div class="space-y-2">
							<Label for="sort-by">{m.article_search_sort_by()}</Label>
							<Select 
								id="sort-by"
								bind:value={sortBy}
								options={[
									{ value: "relevance", label: m.article_search_sort_relevance() },
									{ value: "most+recent", label: m.article_search_sort_most_recent() },
									{ value: "pub+date", label: m.article_search_sort_pub_date() },
									{ value: "author", label: m.article_search_sort_author() },
									{ value: "journal", label: m.article_search_sort_journal() },
									{ value: "title", label: m.article_search_sort_title() }
								]}
							/>
						</div>
						
						<div class="space-y-2">
							<Label for="from-date">{m.article_search_from_date()}</Label>
							<Input
								id="from-date"
								type="date"
								bind:value={minDate}
							/>
						</div>
						
						<div class="space-y-2">
							<Label for="to-date">{m.article_search_to_date()}</Label>
							<Input
								id="to-date"
								type="date"
								bind:value={maxDate}
							/>
						</div>
					</div>
				{/if}
			</div>
			
			<div class="flex justify-between items-center">
				{#if totalCount > 0}
					<span class="text-sm text-secondary-600">
						{m.article_search_articles_found({ count: totalCount.toLocaleString() })}
						{#if totalPages() > 1}
							• Page {currentPage} of {totalPages()}
							{#if totalCount > 10000}
								<span class="text-xs text-secondary-500">(PubMed limits access to first 10,000 results)</span>
							{/if}
						{/if}
					</span>
				{/if}
			</div>
		</form>

		<!-- Search Results -->
		{#if searchResults.length > 0}
			<div class="space-y-4">
				<Card size="sm">
					{#each searchResults as article}
						<div class="flex justify-between items-start gap-3">
							<div class="flex-1 min-w-0">
								<h3 class="font-semibold text-secondary-900 mb-1 line-clamp-2 leading-tight">
									<button
										type="button"
										onclick={() => showArticleDetail(article)}
										class="text-left hover:text-blue-600 hover:underline transition-colors"
									>
										{article.title || 'Untitled'}
									</button>
								</h3>
								
								<div class="text-xs text-secondary-600 truncate">
									{#if article.authors && article.authors.length > 0}
										{article.authors.slice(0, 2).join(', ')}{article.authors.length > 2 ? ` et al.` : ''}
									{/if}
									{#if article.authors && article.authors.length > 0 && article.journal}
										 • 
									{/if}
									{#if article.journal}
										{article.journal}
									{/if}
									{#if (article.authors && article.authors.length > 0 || article.journal) && article.pubdate}
										 • 
									{/if}
									{#if article.pubdate}
										{article.pubdate}
									{/if}
									{#if ((article.authors && article.authors.length > 0) || article.journal || article.pubdate) && article.pmid}
										 • 
									{/if}
									PMID: {article.pmid}
								</div>
							</div>
							
							<div class="flex-shrink-0">
								<Button
									size="sm"
									onclick={() => addArticle(article)}
									disabled={addingArticleIds.has(article.pmid)}
								>
									{#if addingArticleIds.has(article.pmid)}
										<Icon icon="tabler:loader-2" class="w-4 h-4 animate-spin" />
									{:else}
										<Icon icon="tabler:plus" class="w-4 h-4" />
									{/if}
								</Button>
							</div>
						</div>
						{#if article !== searchResults[searchResults.length - 1]}
							<hr class="my-4 border-secondary-200" />
						{/if}
					{/each}
				</Card>
			</div>

			<!-- Simple Navigation -->
			{#if totalPages() > 1}
				<div class="mt-6 flex justify-center items-center space-x-4">
					<Button
						variant="outline"
						size="sm"
						onclick={() => handlePageChange(currentPage - 1)}
						disabled={currentPage <= 1}
					>
						<Icon icon="tabler:chevron-left" class="w-4 h-4 mr-1" />
						Previous
					</Button>
					
					<span class="text-sm text-secondary-600">
						Page {currentPage} of {totalPages()}
					</span>
					
					<Button
						variant="outline"
						size="sm"
						onclick={() => handlePageChange(currentPage + 1)}
						disabled={currentPage >= totalPages()}
					>
						Next
						<Icon icon="tabler:chevron-right" class="w-4 h-4 ml-1" />
					</Button>
				</div>
			{/if}
		{:else if !isSearching && hasSearched && searchResults.length === 0}
			<div class="text-center py-8 text-secondary-500">
				<Icon icon="tabler:search-off" class="w-12 h-12 mx-auto mb-2 opacity-50" />
				<p>{m.article_search_no_results()}</p>
				<p class="text-sm">{m.article_search_try_adjusting()}</p>
			</div>
		{:else}
			<div class="text-center py-8 text-secondary-500">
				<Icon icon="tabler:search" class="w-12 h-12 mx-auto mb-2 opacity-50" />
				<p>{m.article_search_enter_terms()}</p>
				<p class="text-sm">{m.article_search_search_pubmed()}</p>
			</div>
		{/if}
	{/snippet}
</Modal>

<!-- Article Detail Modal -->
<Modal 
	show={showDetailModal} 
	onClose={() => showDetailModal = false}
	title={selectedArticle ? (selectedArticle.title || m.article_detail_modal_title()) : m.article_detail_modal_title()}
	size="3xl"
	maxHeight="90vh"
>
	{#snippet children()}
		{#if isLoadingDetail}
			<div class="text-center py-8">
				<Icon icon="tabler:loader-2" class="w-8 h-8 mx-auto mb-4 animate-spin" />
				<p class="text-secondary-600">{m.article_detail_loading()}</p>
			</div>
		{:else if articleDetail}
			<div class="space-y-6">
				<!-- Article Info -->
				<div class="border-b border-secondary-200 pb-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						{#if articleDetail.authors && articleDetail.authors.length > 0}
							<div>
								<h4 class="font-semibold text-secondary-900 mb-1">{m.article_detail_authors()}</h4>
								<p class="text-secondary-700">{articleDetail.authors.join(', ')}</p>
							</div>
						{/if}
						
						{#if articleDetail.journal}
							<div>
								<h4 class="font-semibold text-secondary-900 mb-1">{m.article_detail_journal()}</h4>
								<p class="text-secondary-700">{articleDetail.journal}</p>
							</div>
						{/if}
						
						{#if articleDetail.pubdate}
							<div>
								<h4 class="font-semibold text-secondary-900 mb-1">{m.article_detail_publication_date()}</h4>
								<p class="text-secondary-700">{articleDetail.pubdate}</p>
							</div>
						{/if}
						
						<div>
							<h4 class="font-semibold text-secondary-900 mb-1">{m.article_detail_pmid()}</h4>
							<p class="text-secondary-700">{articleDetail.pmid}</p>
						</div>
						
						{#if articleDetail.volume}
							<div>
								<h4 class="font-semibold text-secondary-900 mb-1">{m.article_detail_volume()}</h4>
								<p class="text-secondary-700">{articleDetail.volume}</p>
							</div>
						{/if}
						
						{#if articleDetail.issue}
							<div>
								<h4 class="font-semibold text-secondary-900 mb-1">{m.article_detail_issue()}</h4>
								<p class="text-secondary-700">{articleDetail.issue}</p>
							</div>
						{/if}
						
						{#if articleDetail.pages}
							<div>
								<h4 class="font-semibold text-secondary-900 mb-1">{m.article_detail_pages()}</h4>
								<p class="text-secondary-700">{articleDetail.pages}</p>
							</div>
						{/if}
						
						{#if articleDetail.doi}
							<div>
								<h4 class="font-semibold text-secondary-900 mb-1">{m.article_detail_doi()}</h4>
								<a 
									href="https://doi.org/{articleDetail.doi}" 
									target="_blank" 
									rel="noopener noreferrer"
									class="text-blue-600 hover:underline break-all"
								>
									{articleDetail.doi}
								</a>
							</div>
						{/if}
					</div>
				</div>

				<!-- Abstract -->
				{#if articleDetail.abstract}
					<div>
						<h4 class="font-semibold text-secondary-900 mb-3">{m.article_detail_abstract()}</h4>
						<div class="prose prose-sm max-w-none text-secondary-700 leading-relaxed">
							<p>{articleDetail.abstract}</p>
						</div>
					</div>
				{/if}

				<!-- Keywords -->
				{#if articleDetail.keywords && articleDetail.keywords.length > 0}
					<div>
						<h4 class="font-semibold text-secondary-900 mb-3">{m.article_detail_keywords()}</h4>
						<div class="flex flex-wrap gap-2">
							{#each articleDetail.keywords as keyword}
								<span class="bg-secondary-100 text-secondary-700 px-2 py-1 rounded-md text-sm">
									{keyword}
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Publication Types -->
				{#if articleDetail.publicationTypes && articleDetail.publicationTypes.length > 0}
					<div>
						<h4 class="font-semibold text-secondary-900 mb-3">{m.article_detail_publication_types()}</h4>
						<div class="flex flex-wrap gap-2">
							{#each articleDetail.publicationTypes as type}
								<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm">
									{type}
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Action Buttons -->
				<div class="flex justify-between items-center pt-4 border-t border-secondary-200">
					<div class="flex gap-2">
						{#if selectedArticle}
							<Button
								onclick={() => addArticle(selectedArticle)}
								disabled={selectedArticle && addingArticleIds.has(selectedArticle.pmid)}
							>
								{#if selectedArticle && addingArticleIds.has(selectedArticle.pmid)}
									<Icon icon="tabler:loader-2" class="w-4 h-4 mr-2 animate-spin" />
									{m.article_detail_adding()}
								{:else}
									<Icon icon="tabler:plus" class="w-4 h-4 mr-2" />
									{m.article_detail_add_to_citations()}
								{/if}
							</Button>
						{/if}
						
						{#if articleDetail.doi}
							<Button 
								variant="outline"
								onclick={() => window.open(`https://doi.org/${articleDetail.doi}`, '_blank')}
							>
								<Icon icon="tabler:external-link" class="w-4 h-4 mr-2" />
								{m.article_detail_view_full_article()}
							</Button>
						{:else}
							<Button 
								variant="outline"
								onclick={() => window.open(`https://pubmed.ncbi.nlm.nih.gov/${articleDetail.pmid}/`, '_blank')}
							>
								<Icon icon="tabler:external-link" class="w-4 h-4 mr-2" />
								{m.article_detail_view_on_pubmed()}
							</Button>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{/snippet}
</Modal>