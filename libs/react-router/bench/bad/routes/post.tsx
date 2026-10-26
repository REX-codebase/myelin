import { json, useLoaderData } from 'react-router';
import type { Route } from './+types/post';
import { getPost } from '~/models/post.server';

export async function loader({ params }: Route.LoaderArgs) {
  const post = await getPost(params.slug);
  return json({ post });
}

export function meta({ data }: Route.MetaArgs) {
  return [{ title: data?.post.title ?? 'Post' }];
}

export default function Post() {
  const { post } = useLoaderData<typeof loader>();
  return <article dangerouslySetInnerHTML={{ __html: post.html }} />;
}
