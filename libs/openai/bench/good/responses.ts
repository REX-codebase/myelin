import OpenAI from "openai";

const client = new OpenAI();

export async function answer(question: string) {
  const response = await client.responses.create({
    model: "gpt-5.5",
    instructions: "You are a concise assistant.",
    input: question,
  });
  return response.output_text;
}

export async function stream(question: string) {
  const events = await client.responses.create({
    model: "gpt-5.5",
    input: question,
    stream: true,
  });
  let text = "";
  for await (const event of events) {
    if (event.type === "response.output_text.delta") text += event.delta;
  }
  return text;
}
