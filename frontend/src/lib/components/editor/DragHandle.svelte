<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import { onMount } from 'svelte';
	import { DragHandlePlugin } from '$lib/components/edra/extensions/drag-handle/index.js';
	import type { Node } from '@tiptap/pm/model';

	interface Props {
		editor: Editor;
	}

	const { editor }: Props = $props();

	let currentNode: Node | null = $state(null);
	let currentNodePos: number = $state(-1);

	const pluginKey = 'globalDragHandle';

	onMount(() => {
		const plugin = DragHandlePlugin({
			pluginKey: pluginKey,
			dragHandleWidth: 32,
			scrollTreshold: 100,
			dragHandleSelector: '.drag-handle',
			excludedTags: ['pre', 'code', 'table p'],
			customNodes: [],
			onMouseMove: onMouseMove
		});
		editor.registerPlugin(plugin);
		return () => editor.unregisterPlugin(pluginKey);
	});

	const onMouseMove = (data: { node: Node; pos: number }) => {
		if (data.node) currentNode = data.node;
		currentNodePos = data.pos;
	};
</script>

<div class="drag-handle flex !h-fit !w-fit !flex-row items-center justify-center gap-1">
	<div class="w-4 h-4 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
			<circle cx="9" cy="6" r="1.5"/>
			<circle cx="15" cy="6" r="1.5"/>
			<circle cx="9" cy="12" r="1.5"/>
			<circle cx="15" cy="12" r="1.5"/>
			<circle cx="9" cy="18" r="1.5"/>
			<circle cx="15" cy="18" r="1.5"/>
		</svg>
	</div>
</div>
