import OpenAI from "openai";
import fs from "node:fs";

const client = new OpenAI();

export async function upload(path: string) {
  const file = await OpenAI.fileFromPath(path);
  return client.files.create({ file, purpose: "user_data" });
}

export async function cleanup(fileIds: string[]) {
  for (const id of fileIds) {
    await client.files.del(id);
  }
  return fs.existsSync("/tmp");
}
