<template>
  <transition name="fade">
    <div v-if="visible" v-click-outside="hide" class="toast">{{ message }}</div>
  </transition>
</template>

<script>
const clickOutside = {
  inserted(el, binding) {
    el.__handler__ = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el.__handler__)
  },
  unbind(el) {
    document.removeEventListener('click', el.__handler__)
  },
}

export default {
  directives: { clickOutside },
  props: { message: String },
  data: () => ({ visible: true }),
  methods: { hide() { this.visible = false } },
}
</script>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity .3s; }
.fade-enter, .fade-leave-to { opacity: 0; }
</style>
