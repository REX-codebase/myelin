import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const docs = defineCollection({
	schema: z.object({ title: z.string() })
});

export const collections = { docs };
