import type { ParsedBlock } from '@/lib/chat/message-types';
import { parseStrategyCard } from '@/lib/chat/text-parsers';
import StrategyTable from './StrategyTable';

type StrategyCardProps = {
  block: ParsedBlock;
};

function detectStrategyTone(title: string, content: string) {
  const text = `${title} ${content}`;

  if (text.includes('做多') || text.includes('回调做多') || text.includes('支撑')) {
    return 'long';
  }

  if (text.includes('做空') || text.includes('冲高做空') || text.includes('阻力')) {
    return 'short';
  }

  return 'neutral';
}

function ToneBadge({ tone }: { tone: 'long' | 'short' | 'neutral' }) {
  const config =
    tone === 'long'
      ? {
          text: '偏多策略',
          className: 'bg-emerald-100 text-emerald-700',
        }
      : tone === 'short'
      ? {
          text: '偏空策略',
          className: 'bg-rose-100 text-rose-700',
        }
      : {
          text: '中性策略',
          className: 'bg-neutral-100 text-neutral-700',
        };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}>
      {config.text}
    </span>
  );
}

export default function StrategyCard({ block }: StrategyCardProps) {
  const data = parseStrategyCard(block);
  const tone = detectStrategyTone(data.title, block.content);

  const theme =
    tone === 'long'
      ? {
          wrap: 'border-emerald-200 bg-emerald-50/60',
          tag: 'bg-emerald-100 text-emerald-700',
        }
      : tone === 'short'
      ? {
          wrap: 'border-rose-200 bg-rose-50/60',
          tag: 'bg-rose-100 text-rose-700',
        }
      : {
          wrap: 'border-neutral-200 bg-neutral-50',
          tag: 'bg-neutral-100 text-neutral-700',
        };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${theme.wrap}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {block.title}
          </div>
          <div className="mt-1 text-lg font-bold text-neutral-900">{data.title}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToneBadge tone={tone} />
          {data.confidence ? (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${theme.tag}`}>
              胜率参考：{data.confidence}
            </span>
          ) : null}
        </div>
      </div>

      {data.positionIdea ? (
        <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="mb-2 text-sm font-semibold text-neutral-900">仓位思路</div>
          <div className="whitespace-pre-wrap text-sm leading-6 text-neutral-700">
            {data.positionIdea}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <StrategyTable title="挂单仓位" rows={data.entries} color="neutral" />
        <StrategyTable title="止盈计划" rows={data.takeProfits} color="green" />
      </div>

      {data.stopLoss ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="mb-2 text-sm font-semibold text-red-700">止损</div>
          <div className="text-sm font-medium text-red-800">{data.stopLoss}</div>
        </div>
      ) : null}

      {data.logic ? (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="mb-2 text-sm font-semibold text-neutral-900">逻辑</div>
          <div className="whitespace-pre-wrap text-sm leading-6 text-neutral-700">
            {data.logic}
          </div>
        </div>
      ) : null}
    </div>
  );
}