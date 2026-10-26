export default defineNuxtConfig({
  ssr: true,
  modules: ['@pinia/nuxt'],
  generate: {
    routes: ['/sitemap.xml', '/robots.txt'],
    exclude: ['/admin'],
  },
  app: {
    head: { title: 'Shop' },
  },
})
