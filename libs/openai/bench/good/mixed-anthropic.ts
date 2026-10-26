import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const openai = new OpenAI();
const anthropic = new Anthropic();

export async function draft(prompt: string, provider: "openai" | "anthropic") {
  if (provider === "anthropic") {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    return msg.content;
  }
  const res = await openai.responses.create({ model: "gpt-5.5", input: prompt });
  return res.output_text;
}
