<template>
  <aside :class="{ open: isOpen }">
    <slot />
  </aside>
</template>

<script>
import { EventBus } from '@/event-bus'

export default {
  data() {
    return { isOpen: false }
  },
  created() {
    EventBus.$on('toggle-sidebar', this.toggle)
  },
  destroyed() {
    EventBus.$off('toggle-sidebar', this.toggle)
  },
  methods: {
    toggle() {
      this.isOpen = !this.isOpen
    },
  },
}
</script>
