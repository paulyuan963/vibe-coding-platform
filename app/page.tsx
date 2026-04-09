'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { ChatMessage } from './api/chat/route';
import ChatComposer from './components/chat/ChatComposer';
import EmptyState from './components/chat/EmptyState';
import MessageBubble from './components/chat/MessageBubble';

export default function HomePage() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error } = useChat<ChatMessage>({
  transport: new DefaultChatTransport({
    api: '/api/chat',
  }),
});

  const isLoading = status === 'streaming' || status === 'submitted';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    await sendMessage({ text });
    setInput('');
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 md:px-6">
        <header className="mb-8">
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
              Crypto Contract Assistant
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-neutral-600">
              支持多步工具调用、日内策略模式与市场分析模式。可查看实时工具执行状态、
              策略卡片，以及结构化分析报告。
            </p>
          </div>
        </header>

        <section className="flex-1 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-5">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={{
                    id: message.id,
                    role: message.role,
                    parts: message.parts as any,
                  }}
                />
              ))}

              {error ? (
                <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                  出错了：{error.message}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <ChatComposer
          input={input}
          setInput={setInput}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      </div>
    </main>
  );
}