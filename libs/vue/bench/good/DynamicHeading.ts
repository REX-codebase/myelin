import { h, defineComponent } from 'vue'

export default defineComponent({
  name: 'DynamicHeading',
  props: {
    level: { type: Number, required: true },
  },
  setup(props, { slots, attrs }) {
    return () => h(`h${props.level}`, attrs, slots.default?.())
  },
})
