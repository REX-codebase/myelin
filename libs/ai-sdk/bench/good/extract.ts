import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function extractInvoice(text: string) {
  const { output } = await generateText({
    model: openai('gpt-5.1'),
    output: Output.object({
      schema: z.object({
        vendor: z.string(),
        total: z.number(),
        dueDate: z.string(),
      }),
    }),
    prompt: `Extract the invoice fields from:\n${text}`,
  });
  return output;
}
