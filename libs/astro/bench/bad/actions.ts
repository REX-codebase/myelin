import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';

export const server = {
	subscribe: defineAction({
		accept: 'form',
		schema: z.object({ email: z.email() }),
		handler: async ({ email }) => {
			return { ok: true, email };
		}
	})
};
