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
	let totalPages = $derived(Math.ceil(totalItems / itemsPerPage));
	let startItem = $derived((currentPage - 1) * itemsPerPage + 1);
	let endItem = $derived(Math.min(currentPage * itemsPerPage, totalItems));

	// Generate page numbers to show
	let visiblePages = $derived(() => {
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

	function getPageButtonClasses(page: number, isCurrent: boolean) {
		const baseClasses = [
			'relative inline-flex items-center justify-center',
			'px-3 py-2 text-sm font-medium',
			'border border-secondary-300',
			'transition-colors duration-200'
		];

		if (isCurrent) {
			baseClasses.push(
				'z-10 bg-primary-600 text-white border-primary-600',
				'hover:bg-primary-700 hover:border-primary-700'
			);
		} else {
			baseClasses.push(
				'bg-white text-secondary-700',
				'hover:bg-secondary-50 hover:text-secondary-900'
			);
		}

		return baseClasses.join(' ');
	}

	function getNavButtonClasses(disabled: boolean) {
		const baseClasses = [
			'relative inline-flex items-center justify-center',
			'px-3 py-2 text-sm font-medium',
			'border border-secondary-300',
			'transition-colors duration-200'
		];

		if (disabled) {
			baseClasses.push(
				'bg-secondary-100 text-secondary-400 cursor-not-allowed'
			);
		} else {
			baseClasses.push(
				'bg-white text-secondary-700',
				'hover:bg-secondary-50 hover:text-secondary-900 cursor-pointer'
			);
		}

		return baseClasses.join(' ');
	}
</script>

{#if totalPages > 1}
	<div class="flex items-center justify-between {className}">
		<!-- Pagination Info -->
		{#if showInfo}
			<div class="text-sm text-secondary-700">
				Showing <span class="font-medium">{startItem}</span> to <span class="font-medium">{endItem}</span> of <span class="font-medium">{totalItems}</span> results
			</div>
		{:else}
			<div></div>
		{/if}

		<!-- Pagination Controls -->
		<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
			<!-- Previous Button -->
			<button
				onclick={goToPrevious}
				disabled={currentPage === 1}
				class="{getNavButtonClasses(currentPage === 1)} rounded-l-md"
				aria-label="Previous page"
			>
				<Icon icon="heroicons:chevron-left" class="w-4 h-4" />
			</button>

			<!-- Page Numbers -->
			{#each visiblePages as page}
				{#if page === -1}
					<!-- Ellipsis -->
					<span class="relative inline-flex items-center px-3 py-2 border border-secondary-300 bg-white text-sm font-medium text-secondary-700">
						...
					</span>
				{:else}
					<button
						onclick={() => goToPage(page)}
						class={getPageButtonClasses(page, page === currentPage)}
						aria-label="Page {page}"
						aria-current={page === currentPage ? 'page' : undefined}
					>
						{page}
					</button>
				{/if}
			{/each}

			<!-- Next Button -->
			<button
				onclick={goToNext}
				disabled={currentPage === totalPages}
				class="{getNavButtonClasses(currentPage === totalPages)} rounded-r-md"
				aria-label="Next page"
			>
				<Icon icon="heroicons:chevron-right" class="w-4 h-4" />
			</button>
		</nav>
	</div>
{/if}