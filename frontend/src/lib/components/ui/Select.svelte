<script lang="ts">
	type SelectSize = 'sm' | 'md' | 'lg';

	interface Option {
		value: string | number;
		label: string;
		disabled?: boolean;
	}

	interface OptionGroup {
		label: string;
		options: Option[];
	}

	interface Props {
		id?: string;
		value?: string | number;
		label?: string;
		placeholder?: string;
		helpText?: string;
		errorMessage?: string;
		disabled?: boolean;
		required?: boolean;
		size?: SelectSize;
		class?: string;
		options?: Option[];
		optionGroups?: OptionGroup[];
		onchange?: (event: Event) => void;
	}

	let {
		id,
		value = $bindable(''),
		label,
		placeholder,
		helpText,
		errorMessage,
		disabled = false,
		required = false,
		size = 'md',
		class: className = '',
		options = [],
		optionGroups = [],
		onchange
	}: Props = $props();

	function getSelectClasses() {
		const baseClasses = [
			'block w-full',
			'bg-white',                    // Surface color from style guide
			'border border-secondary-300', // Border from style guide
			'rounded-lg',                  // 8px radius from style guide
			'text-secondary-900',          // Primary text color
			'transition-colors',
			'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
			'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-secondary-50',
			'appearance-none',             // Remove default arrow
			'bg-no-repeat bg-right pr-10', // Space for custom arrow
			'cursor-pointer'
		];
		
		let sizeClasses = '';
		switch (size) {
			case 'sm':
				sizeClasses = 'px-3 py-2 text-sm';
				break;
			case 'lg':
				sizeClasses = 'px-4 py-4 text-base';
				break;
			default:
				sizeClasses = 'px-3 py-2 text-sm';  // 14px body text from style guide
		}
		
		// Error state styling
		const errorClasses = errorMessage 
			? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
			: '';
		
		return [...baseClasses, sizeClasses, errorClasses, className].join(' ');
	}

	function getLabelClasses() {
		return [
			'block text-sm font-medium mb-2',
			'text-secondary-700'               // Secondary text from style guide
		].join(' ');
	}

	function getHelpTextClasses() {
		return errorMessage 
			? 'text-sm text-red-600'      // Error color
			: 'text-sm text-secondary-600';    // Secondary text from style guide
	}
</script>

<div class="space-y-2">
	<div class="relative">
		<select
			id={id}
			bind:value
			{disabled}
			{required}
			{onchange}
			class={getSelectClasses()}
		>
			{#if placeholder}
				<option value="" disabled selected={!value}>
					{placeholder}
				</option>
			{/if}
			
			{#if optionGroups.length > 0}
				{#each optionGroups as group}
					<optgroup label={group.label}>
						{#each group.options as option}
							<option 
								value={option.value} 
								disabled={option.disabled}
							>
								{option.label}
							</option>
						{/each}
					</optgroup>
				{/each}
			{:else}
				{#each options as option}
					<option 
						value={option.value} 
						disabled={option.disabled}
					>
						{option.label}
					</option>
				{/each}
			{/if}
		</select>
		
		<!-- Custom arrow -->
		<div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
			<svg class="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>
	</div>
	
	<!-- Help text or error message -->
	{#if helpText || errorMessage}
		<div class={getHelpTextClasses()}>
			{errorMessage || helpText}
		</div>
	{/if}
</div>