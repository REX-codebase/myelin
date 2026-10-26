<script setup lang="ts">
import { ref, type Directive } from 'vue'

const { message } = defineProps<{ message: string }>()
const visible = ref(true)

type Handler = (e: MouseEvent) => void
const handlers = new WeakMap<HTMLElement, (e: MouseEvent) => void>()

const vClickOutside: Directive<HTMLElement, Handler> = {
  mounted(el, binding) {
    const onClick = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value(e)
    }
    handlers.set(el, onClick)
    document.addEventListener('click', onClick)
  },
  unmounted(el) {
    const onClick = handlers.get(el)
    if (onClick) document.removeEventListener('click', onClick)
  },
}
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" v-click-outside="() => (visible = false)" class="toast">{{ message }}</div>
  </Transition>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
