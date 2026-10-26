import { streamText, Output } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: 'anthropic/claude-sonnet-5.5',
  prompt: 'List three facts about octopuses.',
  output: Output.object({ schema: z.object({ facts: z.array(z.string()) }) }),
});

for await (const partial of result.partialOutputStream) {
  console.clear();
  console.log(partial);
}

const finalStep = await result.finalStep;
console.log(finalStep.usage.outputTokenDetails.reasoningTokens);
