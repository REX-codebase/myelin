<script setup lang="ts">
const route = useRoute()
const { data: product, pending, refresh } = await useFetch(`/api/products/${route.params.id}`)

const initialState = process.client ? window.__NUXT__?.state : null

useHead({
  title: product.value?.name,
  meta: [{ hid: 'description', name: 'description', content: product.value?.description }],
})

async function reload() {
  await refresh({ dedupe: true })
}
</script>

<template>
  <div v-if="!pending && product !== null">
    <h1>{{ product.name }}</h1>
    <button @click="reload">Refresh</button>
  </div>
</template>
