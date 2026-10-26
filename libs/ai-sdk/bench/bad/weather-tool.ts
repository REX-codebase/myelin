import { generateText, tool, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const weather = tool({
  description: 'Get the weather in a location',
  parameters: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async ({ location }) => ({ location, temperature: 72 }),
});

export async function run(question: string) {
  const result = await generateText({
    model: anthropic('claude-sonnet-4-5'),
    tools: { weather },
    stopWhen: stepCountIs(5),
    prompt: question,
    onStepFinish: ({ toolCalls }) => console.log('tool calls', toolCalls.length),
  });
  console.log('prompt tokens', result.usage.promptTokens);
  return result.text;
}
