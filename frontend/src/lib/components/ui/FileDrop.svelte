<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from './Button.svelte';

	interface Props {
		acceptedTypes?: string[];
		acceptedExtensions?: string[];
		onFileSelect?: (file: File) => void;
		disabled?: boolean;
		class?: string;
		title?: string;
		description?: string;
		buttonText?: string;
		dragText?: string;
		formatText?: string;
	}

	let {
		acceptedTypes = ['.md', '.txt', '.docx'],
		acceptedExtensions = ['md', 'txt', 'docx'],
		onFileSelect = () => {},
		disabled = false,
		class: className = '',
		title = 'Upload File',
		description = 'Drag and drop your file here, or click to browse',
		buttonText = 'Choose File',
		dragText = 'Drop file here',
		formatText = ''
	}: Props = $props();

	let fileInput: HTMLInputElement;
	let isDragging = $state(false);

	// Generate accept string for input
	const acceptString = acceptedTypes.join(',');
	
	// Generate format text if not provided
	const displayFormatText = formatText || `Supported formats: ${acceptedTypes.join(', ')}`;

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file && !disabled) {
			validateAndSelectFile(file);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		
		const file = event.dataTransfer?.files[0];
		if (file && !disabled) {
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
			const error = new Error(`Invalid file type. ${displayFormatText}`);
			console.error('File validation error:', error);
			// You can emit this error or handle it as needed
			return;
		}

		onFileSelect(file);
	}

	function openFilePicker() {
		if (!disabled) {
			fileInput?.click();
		}
	}
</script>

<div 
	class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors {className}"
	class:border-blue-400={isDragging && !disabled}
	class:bg-blue-50={isDragging && !disabled}
	class:border-gray-200={disabled}
	class:bg-gray-50={disabled}
	class:opacity-60={disabled}
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	role="button"
	tabindex="0"
	aria-label={title}
>
	<Icon 
		icon="heroicons:arrow-up-tray" 
		class="w-8 h-8 mx-auto mb-2 {disabled ? 'text-gray-300' : 'text-gray-400'}"
	/>
	
	{#if isDragging && !disabled}
		<p class="text-sm text-blue-600 mb-2 font-medium">{dragText}</p>
	{:else}
		<p class="text-sm text-gray-600 mb-2">{description}</p>
	{/if}
	
	<p class="text-xs text-gray-500 mb-4">{displayFormatText}</p>
	
	<input
		bind:this={fileInput}
		type="file"
		accept={acceptString}
		onchange={handleFileSelect}
		class="hidden"
		{disabled}
	/>
	
	<Button
		onclick={openFilePicker}
		variant="secondary"
		iconLeft="heroicons:folder-open"
		{disabled}
	>
		{buttonText}
	</Button>
</div>