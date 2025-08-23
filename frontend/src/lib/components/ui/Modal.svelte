<script lang="ts">
	import { browser } from '$app/environment';
	import Button from './Button.svelte';

	interface Props {
		show?: boolean;
		title?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
		onClose?: () => void;
		showCloseButton?: boolean;
		closeOnBackdrop?: boolean;
		maxHeight?: string;
		scrollable?: boolean;
		children?: any;
	}

	let {
		show = false,
		title = '',
		size = 'md',
		onClose = () => {},
		showCloseButton = true,
		closeOnBackdrop = true,
		maxHeight = '80vh',
		scrollable = true,
		children
	}: Props = $props();

	// Size classes
	const sizeClasses = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl',
		'2xl': 'max-w-2xl',
		'3xl': 'max-w-3xl',
		'4xl': 'max-w-4xl'
	};

	function handleBackdropClick(e: MouseEvent) {
		if (closeOnBackdrop && e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && show) {
			onClose();
		}
	}

	// Add event listener for escape key
	$effect(() => {
		if (browser && show) {
			document.addEventListener('keydown', handleKeydown);
			// Prevent body scroll when modal is open
			document.body.style.overflow = 'hidden';

			return () => {
				document.removeEventListener('keydown', handleKeydown);
				document.body.style.overflow = '';
			};
		}
	});
</script>

{#if show}
	<div 
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby={title ? 'modal-title' : undefined}
	>
		<div 
			class="bg-white rounded-lg shadow-xl w-full {sizeClasses[size]} mx-4 flex flex-col"
			style="max-height: {maxHeight};"
		>
			{#if title || showCloseButton}
				<div class="flex items-center justify-between p-6 border-b border-secondary-200 flex-shrink-0">
					{#if title}
						<h2 id="modal-title" class="text-xl font-semibold text-secondary-900">{title}</h2>
					{/if}
					{#if showCloseButton}
						<button
							onclick={onClose}
							class="text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
							aria-label="Close modal"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					{/if}
				</div>
			{/if}
			
			<div class="p-6 {scrollable ? 'overflow-y-auto flex-1' : ''}">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}