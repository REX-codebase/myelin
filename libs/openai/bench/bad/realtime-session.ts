import OpenAI from "openai";

const client = new OpenAI();

export async function openVoiceSession() {
  const session = await client.beta.realtime.sessions.create({
    model: "gpt-realtime",
    voice: "alloy",
  });
  return session.client_secret.value;
}
