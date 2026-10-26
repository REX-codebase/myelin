import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPostBySlug } from '@/lib/posts'

export async function generateMetadata(props: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  const post = await getPostBySlug(slug)
  return { title: post?.title ?? 'Not found' }
}

export default async function BlogPostPage(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  const query = await props.searchParams
  const post = await getPostBySlug(slug)
  if (!post) notFound()
  const isPreview = query.preview === 'true'
  return (
    <article>
      {isPreview && <p className="banner">Preview mode</p>}
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  )
}
