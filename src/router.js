import { createRouter, createWebHashHistory } from 'vue-router'

// Dummy component — App.vue handles all rendering itself, syncing with route
const Passthrough = { render() { return null } }

const routes = [
  { path: '/', redirect: '/chapter/1' },
  { path: '/chapter/:id(\\d+)', name: 'chapter', component: Passthrough },
  { path: '/about', name: 'about', component: Passthrough },
  { path: '/acknowledgement', name: 'acknowledgement', component: Passthrough },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
