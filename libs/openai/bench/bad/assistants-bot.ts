import OpenAI from "openai";

const openai = new OpenAI();

export async function askSupport(question: string) {
  const assistant = await openai.beta.assistants.create({
    name: "Support",
    instructions: "Answer billing questions politely.",
    model: "gpt-4o",
  });
  const thread = await openai.beta.threads.create();
  await openai.beta.threads.messages.create(thread.id, { role: "user", content: question });
  const run = await openai.beta.threads.runs.createAndPoll(thread.id, { assistant_id: assistant.id });
  return run.status;
}
