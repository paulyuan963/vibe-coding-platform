import type { GenericPart } from '@/lib/chat/message-types';
import AssistantTextMessage from './AssistantTextMessage';
import ToolPartCard from './ToolPartCard';

type AssistantMessageProps = {
  parts: GenericPart[];
};

function shouldHidePart(part: GenericPart) {
  return (
    part.type === 'step-start' ||
    part.type === 'step-finish' ||
    part.type === 'step-end'
  );
}

export default function AssistantMessage({ parts }: AssistantMessageProps) {
  const visibleParts = parts.filter((part) => !shouldHidePart(part));

  if (!visibleParts.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      {visibleParts.map((part, index) => {
        if (part.type === 'text') {
          return <AssistantTextMessage key={`text-${index}`} text={part.text || ''} />;
        }

        if (part.type?.startsWith('tool-')) {
          return <ToolPartCard key={`tool-${index}`} part={part} />;
        }

        return null;
      })}
    </div>
  );
}