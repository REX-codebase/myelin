import express from 'express';
import {
  streamText,
  convertToModelMessages,
  pipeUIMessageStreamToResponse,
  toUIMessageStream,
  type UIMessage,
} from 'ai';

const app = express();
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const messages = req.body.messages as UIMessage[];
  const result = streamText({
    model: 'openai/gpt-5.1',
    messages: await convertToModelMessages(messages),
    onEnd: ({ usage }) => console.log('total tokens', usage.totalTokens),
  });
  await pipeUIMessageStreamToResponse({
    response: res,
    stream: toUIMessageStream({ stream: result.stream }),
  });
});

app.listen(3000);
