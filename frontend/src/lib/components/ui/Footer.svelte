<script lang="ts">
	import Icon from '@iconify/svelte';
	import * as m from '$lib/paraglide/messages.js';
</script>

<footer class="bg-white py-8 border-t border-secondary-200">
	<div class="max-w-5xl mx-auto px-6">
		<div class="relative flex items-center justify-center text-sm text-secondary-500">
			<div class="flex items-center gap-4">
				<a href="https://pnucolab.com/" target="_blank" rel="noopener noreferrer" class="hover:text-primary-600 transition-colors">
					{m.main_footer_org()}
				</a>
				<span>© 2025</span>
			</div>
			<a
				href="https://github.com/pnucolab/colab-tools"
				target="_blank"
				rel="noopener noreferrer"
				class="absolute right-0 hover:text-primary-600 transition-colors"
				title="View on GitHub"
			>
				<Icon icon="mdi:github" class="w-5 h-5" />
			</a>
		</div>
	</div>
</footer>
