import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const client = new OpenAI();

const Invoice = z.object({
  vendor: z.string(),
  total: z.number(),
  dueDate: z.string(),
});

export async function extractInvoice(text: string) {
  const completion = await client.chat.completions.parse({
    model: "gpt-5.5",
    messages: [{ role: "user", content: `Extract the invoice:\n${text}` }],
    response_format: zodResponseFormat(Invoice, "invoice"),
  });
  return completion.choices[0].message.parsed;
}
