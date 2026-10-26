<template>
  <input
    :value="query"
    placeholder="Search..."
    @input="onInput"
    @keyup.13="submit"
  />
</template>

<script>
export default {
  model: {
    prop: 'query',
    event: 'change',
  },
  props: { query: String },
  methods: {
    onInput(e) {
      this.$emit('input', e.target.value)
    },
    submit() {
      this.$emit('search', this.query)
    },
  },
}
</script>
