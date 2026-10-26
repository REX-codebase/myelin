import { ToolLoopAgent, embed, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const search = tool({
  description: 'Search the knowledge base',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: query,
    });
    return { hits: embedding.length };
  },
});

export const supportAgent = new ToolLoopAgent({
  model: openai('gpt-5.1'),
  instructions: 'You are a support agent. Use search before answering.',
  tools: { search },
  telemetry: { functionId: 'support-agent' },
});

export async function answer(question: string) {
  const result = await supportAgent.generate({ prompt: question });
  console.log(result.usage.inputTokens, result.usage.inputTokenDetails.cacheReadTokens);
  return result.text;
}
