<script setup lang="ts">
import { useQueries } from 'vue-query'

const props = defineProps<{ ids: number[] }>()

const results = useQueries(
  [
    ...props.ids.map((id) => ({
      queryKey: ['todo', id],
      queryFn: () => fetch(`/api/todos/${id}`).then((r) => r.json()),
    })),
  ],
)
</script>

<template>
  <ul>
    <li v-for="r in results" :key="r.data?.id">{{ r.data?.title }}</li>
  </ul>
</template>
