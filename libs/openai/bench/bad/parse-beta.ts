import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const client = new OpenAI();

const Recipe = z.object({ name: z.string(), steps: z.array(z.string()) });

export async function recipe(dish: string) {
  const completion = await client.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [{ role: "user", content: `Recipe for ${dish}` }],
    response_format: zodResponseFormat(Recipe, "recipe"),
  });
  return completion.choices[0].message.parsed;
}
