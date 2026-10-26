import { error, json } from '@sveltejs/kit';
import { DATABASE_URL } from '$env/static/private';
import { getPost } from '$lib/server/posts';

export async function load({ params }) {
	const post = await getPost(DATABASE_URL, params.slug);
	if (!post) error(404, { message: 'Post not found', code: 'NOT_FOUND' });
	return { post };
}

export const actions = {
	default: async () => json({ ok: true })
};
