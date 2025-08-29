<script lang="ts">
	import Icon from '@iconify/svelte';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		acceptedTypes?: string[];
		onFileSelect?: (file: File) => void;
		multiple?: boolean;
		disabled?: boolean;
		class?: string;
		title?: string;
		description?: string;
		formatText?: string;
	}

	let {
		acceptedTypes = ['.md', '.txt', '.docx'],
		onFileSelect = () => {},
		multiple = false,
		disabled = false,
		class: className = '',
		title,
		description,
		formatText
	}: Props = $props();

	let isDragging = $state(false);

	// Generate accept string for input
	const acceptString = acceptedTypes.join(',');
	
	// Use i18n with fallbacks for props
	const displayTitle = $derived(() => title ?? m.filedrop_title());
	const displayDescription = $derived(() => description ?? m.filedrop_description());
	const displayFormatText = $derived(() => formatText ?? m.filedrop_supports({ formats: acceptedTypes.join(', ') }));

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files || disabled) return;
		
		for (const file of Array.from(files)) {
			validateAndSelectFile(file);
		}
		
		// Clear the input
		input.value = '';
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		
		const files = event.dataTransfer?.files;
		if (!files || disabled) return;
		
		for (const file of Array.from(files)) {
			validateAndSelectFile(file);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (!disabled) {
			isDragging = true;
		}
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function validateAndSelectFile(file: File) {
		const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
		
		if (!acceptedTypes.includes(fileExtension)) {
			const error = new Error(`Invalid file type. ${displayFormatText()}`);
			console.error('File validation error:', error);
			// You can emit this error or handle it as needed
			return;
		}

		onFileSelect(file);
	}
</script>

<div class="border-2 border-dashed border-secondary-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors relative {className}"
	class:border-primary-400={isDragging && !disabled}
	class:bg-primary-50={isDragging && !disabled}
	class:border-secondary-200={disabled}
	class:bg-secondary-50={disabled}
	class:opacity-60={disabled}
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}>
	<input
		type="file"
		{multiple}
		onchange={handleFileSelect}
		class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
		accept={acceptString}
		{disabled}
	/>
	<Icon icon="heroicons:document-plus" class="w-12 h-12 mx-auto mb-3 text-secondary-400" />
	<p class="text-secondary-600 mb-1">{displayDescription()}</p>
	<p class="text-sm text-secondary-500">{displayFormatText()}</p>
</div>