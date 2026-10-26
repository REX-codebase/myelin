import * as z from "zod";

const CreatePost = z.object({
  title: z.string().min(1),
  tags: z.array(z.string()).max(5),
});

export async function handler(body: unknown) {
  const result = CreatePost.safeParse(body);
  if (!result.success) {
    return {
      status: 400,
      issues: result.error.issues,
      tree: z.treeifyError(result.error),
      message: z.prettifyError(result.error),
    };
  }
  return { status: 201, post: result.data };
}
