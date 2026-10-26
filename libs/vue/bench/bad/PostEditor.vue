<template>
  <div>
    <TitleField :title.sync="post.title" />
    <TagList ref="tags" :tags="post.tags" />
    <button @click="addMeta">Add meta</button>
  </div>
</template>

<script>
export default {
  data() {
    return { post: { title: '', tags: [] } }
  },
  methods: {
    addMeta() {
      this.$set(this.post, 'meta', { createdAt: Date.now() })
      this.$children.forEach((child) => child.refresh && child.refresh())
    },
  },
}
</script>
