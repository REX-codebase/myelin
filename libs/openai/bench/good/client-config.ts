import OpenAI from "openai";

export const client = new OpenAI({
  maxRetries: 3,
  timeout: 20_000,
});

export async function ping() {
  const models = await client.models.list();
  return models.data.length;
}
