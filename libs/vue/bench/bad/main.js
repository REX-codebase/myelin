import Vue from 'vue'
import VueRouter from 'vue-router'
import axios from 'axios'
import App from './App.vue'
import Home from './views/Home.vue'
import NotFound from './views/NotFound.vue'

Vue.use(VueRouter)
Vue.config.productionTip = false
Vue.prototype.$http = axios
Vue.filter('uppercase', (value) => String(value).toUpperCase())

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    { path: '/', name: 'Home', component: Home },
    { path: '/about', name: 'About', component: () => import('./views/About.vue') },
    { path: '*', component: NotFound },
  ],
})

new Vue({
  router,
  render: (h) => h(App),
}).$mount('#app')
