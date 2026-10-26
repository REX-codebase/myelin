import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';

export const server = {
	subscribe: defineAction({
		accept: 'form',
		input: z.object({ email: z.email() }),
		handler: async ({ email }) => {
			if (!email.endsWith('@example.com')) {
				throw new ActionError({ code: 'BAD_REQUEST', message: 'Use a company address' });
			}
			return { ok: true };
		}
	})
};
