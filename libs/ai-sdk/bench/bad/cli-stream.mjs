import { streamText, Output } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: 'anthropic/claude-sonnet-4.5',
  prompt: 'List three facts about octopuses.',
  experimental_output: Output.object({ schema: z.object({ facts: z.array(z.string()) }) }),
});

for await (const part of result.fullStream) {
  if (part.type === 'text-delta') process.stdout.write(part.text);
}
