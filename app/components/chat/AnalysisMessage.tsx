'use client';

import { useMemo } from 'react';
import { splitAnalysisBlocks } from '@/lib/chat/text-parsers';
import AnalysisSection from './AnalysisSection';

type AnalysisMessageProps = {
  text: string;
};

export default function AnalysisMessage({ text }: AnalysisMessageProps) {
  const blocks = useMemo(() => splitAnalysisBlocks(text), [text]);

  if (!blocks) {
    return (
      <div className="rounded-2xl border border-blue-100 bg-white p-4 font-medium whitespace-pre-wrap">
        {text || '...'}
      </div>
    );
  }

  const firstSectionIndex = text.search(/\n?1\. 市场总览/);
  const header = firstSectionIndex > 0 ? text.slice(0, firstSectionIndex).trim() : '';

  return (
    <div className="space-y-4">
      {header ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="whitespace-pre-wrap text-neutral-900">{header}</div>
        </div>
      ) : null}

      {blocks.map((block, index) => {
        const variant = block.title === '5. 分析师观点' ? 'highlight' : 'default';

        return (
          <AnalysisSection
            key={`${block.title}-${index}`}
            title={block.title}
            content={block.content}
            variant={variant}
          />
        );
      })}
    </div>
  );
}