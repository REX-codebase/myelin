import { streamText, convertToModelMessages, type UIMessage } from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: 'openai/gpt-5.1',
    messages: [
      { role: 'system', content: 'Answer in one short paragraph.' },
      ...convertToModelMessages(messages),
    ],
  });

  return result.toUIMessageStreamResponse();
}
