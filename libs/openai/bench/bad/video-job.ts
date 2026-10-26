import OpenAI from "openai";

const openai = new OpenAI();

export async function makeClip(prompt: string) {
  const video = await openai.videos.create({ model: "sora-2", prompt });
  return video.id;
}
