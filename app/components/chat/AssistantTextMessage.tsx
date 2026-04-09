import {
  isAnalysisText,
  isStrategyText,
  splitStrategyBlocks,
} from '@/lib/chat/text-parsers';
import AnalysisMessage from './AnalysisMessage';
import StrategyCard from './StrategyCard';

type AssistantTextMessageProps = {
  text: string;
};

function cleanText(raw: string) {
  return raw
    .replace(/风险提示[:：][\s\S]*/g, '')
    .replace(/⚠️.*$/gm, '')
    .trim();
}

function extractConclusion(text: string) {
  const match = text.match(/结论[:：]\s*([\s\S]*?)(?:风险提示[:：]|⚠️|$)/);
  return match?.[1]?.trim() || '';
}

function extractBulletItems(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /^[-•·]/.test(line))
    .map((line) => line.replace(/^[-•·]\s*/, ''))
    .slice(0, 4);
}

function PlainTextCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 font-medium whitespace-pre-wrap">
      {text || '...'}
    </div>
  );
}

function SummaryCards({ text }: { text: string }) {
  const conclusion = extractConclusion(text);
  const bullets = extractBulletItems(text);

  if (!conclusion && bullets.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {conclusion ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="mb-2 text-sm font-semibold text-amber-900">关键结论</div>
          <div className="text-sm leading-6 text-amber-900">{conclusion}</div>
        </div>
      ) : null}

      {bullets.length > 0 ? (
        <div className="rounded-2xl border border-sky-300 bg-sky-50 p-4">
          <div className="mb-2 text-sm font-semibold text-sky-900">关键点</div>
          <div className="space-y-2">
            {bullets.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="rounded-xl bg-white px-3 py-2 text-sm text-sky-900"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AssistantTextMessage({
  text,
}: AssistantTextMessageProps) {
  const cleanedText = cleanText(text);

  if (isStrategyText(cleanedText)) {
    const blocks = splitStrategyBlocks(cleanedText);

    if (!blocks) {
      return <PlainTextCard text={cleanedText} />;
    }

    const strategyA = blocks.find((b) => b.title === '策略A');
    const strategyB = blocks.find((b) => b.title === '策略B');
    const conclusion = blocks.find((b) => b.title === '结论');

    const strategyHeaderIndex = cleanedText.search(/\n?策略A：/);
    const header =
      strategyHeaderIndex > 0 ? cleanedText.slice(0, strategyHeaderIndex).trim() : '';

    return (
      <div className="space-y-4">
        {header ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="text-lg font-bold text-neutral-900">{header}</div>
          </div>
        ) : null}

        <SummaryCards text={cleanedText} />

        {strategyA ? <StrategyCard block={strategyA} /> : null}
        {strategyB ? <StrategyCard block={strategyB} /> : null}

        {conclusion ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <div className="mb-2 text-sm font-semibold text-amber-900">结论</div>
            <div className="whitespace-pre-wrap text-sm leading-6 text-amber-900">
              {conclusion.content}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (isAnalysisText(cleanedText)) {
    return (
      <div className="space-y-4">
        <SummaryCards text={cleanedText} />
        <AnalysisMessage text={cleanedText} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SummaryCards text={cleanedText} />
      <PlainTextCard text={cleanedText} />
    </div>
  );
}