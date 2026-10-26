<script lang="ts">
	import type { ComponentType } from 'svelte';
	import Overview from './Overview.svelte';
	import Settings from './Settings.svelte';

	const tabs: { label: string; component: ComponentType }[] = [
		{ label: 'Overview', component: Overview },
		{ label: 'Settings', component: Settings }
	];
	let current = $state(tabs[0]);
</script>

{#each tabs as tab}
	<button onclick={() => (current = tab)}>{tab.label}</button>
{/each}

<svelte:component this={current.component} />
