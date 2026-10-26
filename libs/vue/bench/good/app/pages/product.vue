<script setup lang="ts">
const route = useRoute()
const id = computed(() => String(route.params.id))

const { data: product, status, refresh } = await useFetch(() => `/api/products/${id.value}`)
const payload = useNuxtApp().payload

useHead({
  title: () => product.value?.name ?? 'Product',
  meta: [{ name: 'description', content: () => product.value?.description ?? '' }],
})

async function reload() {
  await refresh({ dedupe: 'cancel' })
}
</script>

<template>
  <div v-if="status === 'success' && product">
    <h1>{{ product.name }}</h1>
    <small v-if="payload.serverRendered">Rendered on the server</small>
    <button @click="reload">Refresh</button>
  </div>
  <p v-else>Loading...</p>
</template>
