import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'
import HomeView from './views/HomeView.vue'
import NotFound from './views/NotFound.vue'
import BaseButton from './components/BaseButton.vue'
import { vFocus } from './directives/focus'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/about', name: 'about', component: () => import('./views/AboutView.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound },
  ],
})

const app = createApp(App)
app.component('BaseButton', BaseButton)
app.directive('focus', vFocus)
app.config.globalProperties.$uppercase = (value: unknown) => String(value).toUpperCase()
app.use(createPinia())
app.use(router)
app.mount('#app')
