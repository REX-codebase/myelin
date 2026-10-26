import { Experimental_Agent as Agent, embed, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const search = tool({
  description: 'Search the knowledge base',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    const { embedding } = await embed({
      model: openai.textEmbedding('text-embedding-3-small'),
      value: query,
    });
    return { hits: embedding.length };
  },
});

export const supportAgent = new Agent({
  model: openai('gpt-5.1'),
  system: 'You are a support agent. Use search before answering.',
  tools: { search },
  experimental_telemetry: { isEnabled: true, functionId: 'support-agent' },
});
