<script setup lang="ts">
const query = defineModel<string>({ default: '' })
const emit = defineEmits<{ search: [query: string] }>()
</script>

<template>
  <input
    v-model="query"
    placeholder="Search..."
    @keyup.enter="emit('search', query)"
  />
</template>
