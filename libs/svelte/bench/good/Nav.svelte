<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/env';
	import { resolve } from '$app/paths';
	import Logo from '#lib/components/Logo.svelte';
</script>

<nav>
	<Logo />
	<a href={resolve('/')} class:active={page.url.pathname === '/'}>Home</a>
	<a href={resolve('/about')} class:active={page.url.pathname === '/about'}>About</a>
	{#if browser}<span>online</span>{/if}
</nav>
