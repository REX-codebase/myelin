<script>
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import Logo from '$lib/components/Logo.svelte';
</script>

<nav>
	<Logo />
	<a href="{base}/" class:active={$page.url.pathname === '/'}>Home</a>
	<a href="{base}/about" class:active={$page.url.pathname === '/about'}>About</a>
	{#if browser}<span>online</span>{/if}
</nav>
