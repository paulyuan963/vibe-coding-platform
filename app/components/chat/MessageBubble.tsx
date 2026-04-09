import type { GenericPart } from '@/lib/chat/message-types';
import AssistantMessage from './AssistantMessage';

type MessageBubbleProps = {
  message: {
    id: string;
    role: string;
    parts: GenericPart[];
  };
};

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`w-full max-w-[95%] rounded-3xl border p-4 shadow-sm md:max-w-[92%] md:p-5 ${
          isUser
            ? 'border-neutral-200 bg-neutral-100'
            : 'border-blue-200 bg-blue-50'
        }`}
      >
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          {isUser ? '你' : '分析助手'}
        </div>

        <div className="space-y-3 text-sm leading-7 text-neutral-800">
          {isUser ? (
            message.parts.map((part, index) => {
              if (part.type !== 'text') return null;

              return (
                <div
                  key={`${message.id}-${index}`}
                  className="whitespace-pre-wrap rounded-2xl"
                >
                  {part.text || '...'}
                </div>
              );
            })
          ) : (
            <AssistantMessage parts={message.parts as GenericPart[]} />
          )}
        </div>
      </div>
    </div>
  );
}