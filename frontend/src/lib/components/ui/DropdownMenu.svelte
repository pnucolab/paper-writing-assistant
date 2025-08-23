<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { clickOutside } from '$lib/utils/clickOutside';
	import Icon from '@iconify/svelte';

	interface DropdownItem {
		label: string;
		value: string;
		icon?: string;
		disabled?: boolean;
		separator?: boolean;
	}

	interface Props {
		items: DropdownItem[];
		trigger?: string;
		triggerIcon?: string;
		placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'left' | 'right';
		disabled?: boolean;
		class?: string;
	}

	let {
		items,
		trigger = 'Menu',
		triggerIcon = 'heroicons:ellipsis-vertical',
		placement = 'bottom-start',
		disabled = false,
		class: className = ''
	}: Props = $props();

	let isOpen = $state(false);
	let dropdownRef: HTMLDivElement;
	
	const dispatch = createEventDispatcher<{
		select: { value: string; item: DropdownItem };
	}>();

	function toggleOpen() {
		if (!disabled) {
			isOpen = !isOpen;
		}
	}

	function closeDropdown() {
		isOpen = false;
	}

	function handleItemClick(item: DropdownItem) {
		if (!item.disabled) {
			dispatch('select', { value: item.value, item });
			closeDropdown();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeDropdown();
		}
	}

	function getPlacementClasses(placement: string) {
		switch (placement) {
			case 'bottom-start':
				return 'top-full left-0 mt-1';
			case 'bottom-end':
				return 'top-full right-0 mt-1';
			case 'top-start':
				return 'bottom-full left-0 mb-1';
			case 'top-end':
				return 'bottom-full right-0 mb-1';
			case 'left':
				return 'right-full top-0 mr-1';
			case 'right':
				return 'left-full top-0 ml-1';
			default:
				return 'top-full left-0 mt-1';
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="relative inline-block {className}" bind:this={dropdownRef}>
	<!-- Trigger Button -->
	<button
		type="button"
		class="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
		class:bg-gray-100={isOpen}
		onclick={toggleOpen}
		{disabled}
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		{#if triggerIcon}
			<Icon icon={triggerIcon} class="w-4 h-4 mr-2" />
		{/if}
		{trigger}
		<Icon icon="heroicons:chevron-down" class="w-4 h-4 ml-2 {isOpen ? 'rotate-180' : ''}" />
	</button>

	<!-- Dropdown Menu -->
	{#if isOpen}
		<div
			class="absolute z-50 min-w-48 bg-white border border-gray-200 rounded-md shadow-lg {getPlacementClasses(placement)}"
			use:clickOutside={closeDropdown}
			role="menu"
			aria-orientation="vertical"
		>
			<div class="py-1">
				{#each items as item (item.value)}
					{#if item.separator}
						<hr class="my-1 border-gray-200" />
					{:else}
						<button
							type="button"
							class="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
							class:cursor-not-allowed={item.disabled}
							class:opacity-50={item.disabled}
							onclick={() => handleItemClick(item)}
							disabled={item.disabled}
							role="menuitem"
						>
							{#if item.icon}
								<Icon icon={item.icon} class="w-4 h-4 mr-3" />
							{/if}
							{item.label}
						</button>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.rotate-180 {
		transform: rotate(180deg);
	}
</style>