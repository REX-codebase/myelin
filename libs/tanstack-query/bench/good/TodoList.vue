<script setup lang="ts">
import { computed } from 'vue'
import { useQueries } from '@tanstack/vue-query'

const props = defineProps<{ ids: number[] }>()

const results = useQueries({
  queries: computed(() =>
    props.ids.map((id) => ({
      queryKey: ['todo', id],
      queryFn: async () => {
        const res = await fetch(`/api/todos/${id}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ id: number; title: string }>
      },
    })),
  ),
})
</script>

<template>
  <ul>
    <li v-for="(r, i) in results" :key="i">{{ r.data?.title }}</li>
  </ul>
</template>
