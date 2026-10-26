export default {
  name: 'DynamicHeading',
  functional: true,
  props: {
    level: { type: Number, required: true },
  },
  render(h, { props, data, children }) {
    return h(`h${props.level}`, data, children)
  },
}
