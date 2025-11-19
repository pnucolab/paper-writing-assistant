<script lang="ts">
	import Icon from '@iconify/svelte';

	type AlertVariant = 'info' | 'warning' | 'error' | 'success';

	interface Props {
		variant?: AlertVariant;
		title?: string;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { variant = 'info', title, class: className = '', children }: Props = $props();

	const variantStyles = {
		info: {
			container: 'bg-blue-50 border-blue-200',
			icon: 'heroicons:information-circle',
			iconColor: 'text-blue-600',
			titleColor: 'text-blue-800',
			textColor: 'text-blue-800'
		},
		warning: {
			container: 'bg-amber-50 border-amber-200',
			icon: 'heroicons:exclamation-triangle',
			iconColor: 'text-amber-600',
			titleColor: 'text-amber-800',
			textColor: 'text-amber-800'
		},
		error: {
			container: 'bg-red-50 border-red-200',
			icon: 'heroicons:exclamation-triangle',
			iconColor: 'text-red-600',
			titleColor: 'text-red-800',
			textColor: 'text-red-800'
		},
		success: {
			container: 'bg-green-50 border-green-200',
			icon: 'heroicons:check-circle',
			iconColor: 'text-green-600',
			titleColor: 'text-green-800',
			textColor: 'text-green-800'
		}
	};

	let styles = $derived(variantStyles[variant]);
</script>

<div class="p-4 rounded-lg border {styles.container} {className}">
	<div class="flex items-start space-x-2">
		<Icon icon={styles.icon} class="w-5 h-5 {styles.iconColor} mt-0.5 flex-shrink-0" />
		<div class="text-sm {styles.textColor} flex-1">
			{#if title}
				<p class="font-medium mb-1">{title}</p>
			{/if}
			{#if children}
				{@render children()}
			{/if}
		</div>
	</div>
</div>
