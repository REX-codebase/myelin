'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, type FormEvent } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onFinish: ({ message }) => console.log('finished', message.id),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <span key={`${message.id}-${i}`}>{part.text}</span>;
              case 'tool-weather':
                return <pre key={`${message.id}-${i}`}>{JSON.stringify(part.output, null, 2)}</pre>;
              default:
                return null;
            }
          })}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={(e) => setInput(e.currentTarget.value)} disabled={status !== 'ready'} />
      </form>
      <button onClick={() => regenerate()}>Retry</button>
    </div>
  );
}
