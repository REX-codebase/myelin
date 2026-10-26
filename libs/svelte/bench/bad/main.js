import App from './App.svelte';

const app = new App({
	target: document.getElementById('app'),
	props: { name: 'world' }
});

app.$on('ready', () => console.log('ready'));

export default app;
