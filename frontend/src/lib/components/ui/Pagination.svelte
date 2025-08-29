<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		currentPage: number;
		totalItems: number;
		itemsPerPage: number;
		onPageChange: (page: number) => void;
		class?: string;
		showInfo?: boolean;
	}

	let {
		currentPage = 1,
		totalItems = 0,
		itemsPerPage = 10,
		onPageChange,
		class: className = '',
		showInfo = true
	}: Props = $props();

	// Calculate pagination values
	let totalPages = $derived(Math.max(1, Math.ceil(totalItems / itemsPerPage)));
	let startItem = $derived((currentPage - 1) * itemsPerPage + 1);
	let endItem = $derived(Math.min(currentPage * itemsPerPage, totalItems));

	// Generate page numbers to show
	let visiblePages = $derived.by(() => {
		const pages: number[] = [];
		const maxVisible = 7; // Total number of page buttons to show
		
		if (totalPages <= maxVisible) {
			// Show all pages if we have few enough
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// Show first, last, current and surrounding pages
			const start = Math.max(1, currentPage - 2);
			const end = Math.min(totalPages, currentPage + 2);
			
			// Always show first page
			if (start > 1) {
				pages.push(1);
				if (start > 2) {
					pages.push(-1); // Ellipsis indicator
				}
			}
			
			// Show current range
			for (let i = start; i <= end; i++) {
				pages.push(i);
			}
			
			// Always show last page
			if (end < totalPages) {
				if (end < totalPages - 1) {
					pages.push(-1); // Ellipsis indicator
				}
				pages.push(totalPages);
			}
		}
		
		return pages;
	});

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages && page !== currentPage) {
			onPageChange(page);
		}
	}

	function goToPrevious() {
		if (currentPage > 1) {
			goToPage(currentPage - 1);
		}
	}

	function goToNext() {
		if (currentPage < totalPages) {
			goToPage(currentPage + 1);
		}
	}

	function goToFirst() {
		if (currentPage > 1) {
			goToPage(1);
		}
	}

	function goToLast() {
		if (currentPage < totalPages) {
			goToPage(totalPages);
		}
	}

	function getPageButtonClasses(isCurrent: boolean) {
		const baseClasses = 'px-2 py-1 text-sm cursor-pointer select-none';
		
		if (isCurrent) {
			return `${baseClasses} font-bold text-blue-600 underline`;
		} else {
			return `${baseClasses} text-secondary-600 hover:text-blue-600 hover:underline`;
		}
	}

	function getNavButtonClasses(disabled: boolean) {
		const baseClasses = 'px-2 py-1 text-sm select-none';
		
		if (disabled) {
			return `${baseClasses} text-secondary-400 cursor-not-allowed`;
		} else {
			return `${baseClasses} text-secondary-600 hover:text-blue-600 cursor-pointer`;
		}
	}
</script>

{#if totalPages > 1}
	<div class="flex items-center justify-center {className}">
		{#if showInfo}
			<div class="text-sm text-secondary-700 mr-4">
				Showing <span class="font-medium">{startItem}</span> to <span class="font-medium">{endItem}</span> of <span class="font-medium">{totalItems}</span> results
			</div>
		{/if}

		<!-- Simple Pagination Controls -->
		<div class="flex items-center space-x-1">
			<!-- First Page -->
			<button
				onclick={goToFirst}
				disabled={currentPage === 1}
				class="{getNavButtonClasses(currentPage === 1)}"
				aria-label="First page"
			>
				&laquo;
			</button>

			<!-- Previous Page -->
			<button
				onclick={goToPrevious}
				disabled={currentPage === 1}
				class="{getNavButtonClasses(currentPage === 1)}"
				aria-label="Previous page"
			>
				&lsaquo;
			</button>

			<!-- Page Numbers -->
			{#each visiblePages as page}
				{#if page === -1}
					<!-- Ellipsis -->
					<span class="px-2 py-1 text-sm text-secondary-500 select-none">...</span>
				{:else}
					<button
						onclick={() => goToPage(page)}
						class="{getPageButtonClasses(page === currentPage)}"
						aria-label="Page {page}"
						aria-current={page === currentPage ? 'page' : undefined}
					>
						{page}
					</button>
				{/if}
			{/each}

			<!-- Next Page -->
			<button
				onclick={goToNext}
				disabled={currentPage === totalPages}
				class="{getNavButtonClasses(currentPage === totalPages)}"
				aria-label="Next page"
			>
				&rsaquo;
			</button>

			<!-- Last Page -->
			<button
				onclick={goToLast}
				disabled={currentPage === totalPages}
				class="{getNavButtonClasses(currentPage === totalPages)}"
				aria-label="Last page"
			>
				&raquo;
			</button>
		</div>
	</div>
{/if}