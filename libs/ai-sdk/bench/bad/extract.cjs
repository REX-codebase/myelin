const { generateObject } = require('ai');
const { openai } = require('@ai-sdk/openai');
const { z } = require('zod');

async function extractInvoice(text) {
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      vendor: z.string(),
      total: z.number(),
      dueDate: z.string(),
    }),
    prompt: `Extract the invoice fields from:\n${text}`,
  });
  return object;
}

module.exports = { extractInvoice };
