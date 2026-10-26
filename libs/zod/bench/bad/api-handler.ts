import { z, ZodError } from "zod";

const CreatePost = z.object({
  title: z.string().min(1),
  tags: z.array(z.string()).max(5),
});

export async function handler(body: unknown) {
  try {
    const post = CreatePost.parse(body);
    return { status: 201, post };
  } catch (err) {
    if (err instanceof ZodError) {
      return { status: 400, errors: err.errors, formatted: err.format() };
    }
    throw err;
  }
}
