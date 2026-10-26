// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText, type CoreMessage } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: CoreMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    system: 'You are a helpful assistant.',
    messages,
    maxTokens: 500,
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
