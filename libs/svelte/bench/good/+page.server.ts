import { error, fail } from '@sveltejs/kit';
import { DATABASE_URL } from '$app/env/private';
import { getPost, savePost } from '#lib/server/posts.ts';

export async function load({ params }) {
	const post = await getPost(DATABASE_URL, params.slug);
	if (!post) error(404, 'Post not found', { code: 'NOT_FOUND' });
	return { post };
}

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const title = data.get('title');
		if (typeof title !== 'string' || !title) return fail(400, { missing: true });
		await savePost(DATABASE_URL, title);
		return { saved: true };
	}
};
