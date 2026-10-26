import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";

const proxy = process.env.HTTPS_PROXY ?? "";

export const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: new HttpsProxyAgent(proxy),
  maxRetries: 2,
});
