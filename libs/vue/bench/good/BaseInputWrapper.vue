<script setup lang="ts">
import { useAttrs, useSlots } from 'vue'

defineOptions({ inheritAttrs: false })
const { label } = defineProps<{ label: string }>()
const emit = defineEmits<{ clear: [] }>()
const attrs = useAttrs()
const slots = useSlots()
</script>

<template>
  <div class="wrapper">
    <label>{{ label }}</label>
    <input v-bind="attrs" />
    <button type="button" @click="emit('clear')">Clear</button>
    <div v-if="slots.hint" class="hint">
      <slot name="hint" />
    </div>
  </div>
</template>
