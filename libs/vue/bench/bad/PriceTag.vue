<template>
  <div class="price-tag">
    <span class="amount">{{ price | currency('EUR') }}</span>
    <span class="label">{{ label | capitalize }}</span>
  </div>
</template>

<script>
export default {
  name: 'PriceTag',
  props: {
    price: { type: Number, required: true },
    label: { type: String, default: '' },
  },
  filters: {
    currency(value, code) {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: code }).format(value)
    },
    capitalize(value) {
      return value.charAt(0).toUpperCase() + value.slice(1)
    },
  },
  mounted() {
    this.timer = setInterval(() => this.$forceUpdate(), 60000)
  },
  beforeDestroy() {
    clearInterval(this.timer)
  },
}
</script>
