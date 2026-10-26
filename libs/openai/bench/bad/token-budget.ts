import OpenAI from "openai";

const client = new OpenAI();

export async function tldr(article: string) {
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "Write a one-paragraph TL;DR." },
      { role: "user", content: article },
    ],
    max_tokens: 300,
    temperature: 0.2,
  });
  return completion.choices[0].message.content;
}
