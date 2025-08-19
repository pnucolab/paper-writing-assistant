<script lang="ts">
	type ToggleSize = 'sm' | 'md' | 'lg';

	interface Props {
		value?: boolean;
		label?: string;
		description?: string;
		disabled?: boolean;
		size?: ToggleSize;
	}

	let {
		value = $bindable(false),
		label,
		description,
		disabled = false,
		size = 'md'
	}: Props = $props();

	let toggleId = `toggle-${Math.random().toString(36).substr(2, 9)}`;

	function getToggleClasses() {
		switch (size) {
			case 'sm': return 'h-5 w-9';
			case 'lg': return 'h-8 w-14';
			default: return 'h-6 w-11';
		}
	}

	function getToggleStyles() {
		const backgroundColor = value ? 'var(--color-blue)' : 'var(--color-border)';
		return `background-color: ${backgroundColor};`;
	}

	function getKnobClasses() {
		const baseClasses = 'inline-block transform rounded-full bg-white transition-transform shadow-sm';
		
		let sizeClasses = '';
		let positionClasses = '';
		
		switch (size) {
			case 'sm':
				sizeClasses = 'h-4 w-4';
				positionClasses = value ? 'translate-x-4' : 'translate-x-0';
				break;
			case 'lg':
				sizeClasses = 'h-6 w-6';
				positionClasses = value ? 'translate-x-6' : 'translate-x-1';
				break;
			default:
				sizeClasses = 'h-4 w-4';
				positionClasses = value ? 'translate-x-6' : 'translate-x-1';
		}
		
		return `${baseClasses} ${sizeClasses} ${positionClasses}`;
	}

	function toggle() {
		if (!disabled) {
			value = !value;
		}
	}
</script>

<div class="flex items-center justify-between">
	{#if label || description}
		<div>
			{#if label}
				<label 
					for={toggleId}
					class="text-sm font-medium cursor-pointer"
					style="color: var(--color-text-primary);"
				>
					{label}
				</label>
			{/if}
			{#if description}
				<p class="text-xs mt-1" style="color: var(--color-text-secondary);">
					{description}
				</p>
			{/if}
		</div>
	{/if}
	
	<button
		id={toggleId}
		onclick={toggle}
		{disabled}
		class="relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed {getToggleClasses()}"
		style={getToggleStyles()}
		aria-checked={value}
		role="switch"
	>
		<span
			class={getKnobClasses()}
		></span>
	</button>
</div>

<style>
	button:focus {
		box-shadow: 0 0 0 2px var(--color-blue);
	}
</style>