<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'

const { price, label = '', currency = 'EUR' } = defineProps<{
  price: number
  label?: string
  currency?: string
}>()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined

const formattedPrice = computed(() =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(price)
)
const capitalizedLabel = computed(() => label.charAt(0).toUpperCase() + label.slice(1))

onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 60000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="price-tag" :data-updated="now">
    <span class="amount">{{ formattedPrice }}</span>
    <span class="label">{{ capitalizedLabel || 'Item' }}</span>
  </div>
</template>
