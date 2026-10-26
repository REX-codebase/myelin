<template>
  <div class="wrapper">
    <label>{{ label }}</label>
    <input v-bind="$attrs" v-on="$listeners" />
    <BaseIcon name="clear" @click.native="clear" />
    <div v-if="$scopedSlots.hint" class="hint">
      <slot name="hint" />
    </div>
  </div>
</template>

<script>
export default {
  inheritAttrs: false,
  props: { label: String },
  methods: {
    clear() {
      this.$emit('clear')
    },
  },
}
</script>
