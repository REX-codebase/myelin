import { defineConfig } from 'astro/config';

export default defineConfig({
	site: 'https://example.com',
	output: 'hybrid',
	experimental: {
		contentLayer: true
	},
	markdown: {
		remarkPlugins: [remarkToc],
		shikiConfig: { theme: 'github-dark' }
	}
});
