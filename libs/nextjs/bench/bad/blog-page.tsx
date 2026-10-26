import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/posts'

type Props = {
  params: { slug: string }
  searchParams: { preview?: string }
}

export default async function BlogPostPage({ params, searchParams }: Props) {
  const post = await getPostBySlug(params.slug)
  if (!post) notFound()
  const isPreview = searchParams.preview === 'true'
  return (
    <article>
      {isPreview && <p className="banner">Preview mode</p>}
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  )
}
