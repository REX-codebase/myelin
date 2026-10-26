export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  modules: ['@pinia/nuxt'],
  nitro: {
    prerender: {
      routes: ['/sitemap.xml', '/robots.txt'],
      ignore: ['/admin'],
    },
  },
  app: {
    head: { title: 'Shop' },
  },
})
