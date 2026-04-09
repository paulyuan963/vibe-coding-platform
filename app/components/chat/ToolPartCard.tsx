import type { GenericPart } from '@/lib/chat/message-types';
import { tryStringify } from '@/lib/chat/text-utils';

type ToolPartCardProps = {
  part: GenericPart;
};

type MarketData = {
  symbol: string;
  price?: string;
  markPrice?: string;
  change24hPct?: string;
  high24h?: string;
  low24h?: string;
  volume24h?: string;
  quoteVolume24h?: string;
  fundingRate?: string;
  openInterest?: string;
  openInterestUsd?: string;
  supportZone?: string;
  resistanceZone?: string;
  asOf?: string;
};

function isMarketData(value: unknown): value is MarketData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return typeof data.symbol === 'string' && 'price' in data;
}

function formatNumber(value?: string, maximumFractionDigits = 2) {
  if (!value) return 'N/A';

  const num = Number(value);
  if (!Number.isFinite(num)) return value;

  return num.toLocaleString('zh-CN', {
    maximumFractionDigits,
  });
}

function formatPercent(value?: string) {
  if (!value) return 'N/A';

  const num = Number(value);
  if (!Number.isFinite(num)) return value;

  return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
}

function formatCompactNumber(value?: string) {
  if (!value) return 'N/A';

  const num = Number(value);
  if (!Number.isFinite(num)) return value;

  return num.toLocaleString('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 2,
  });
}

function formatTimestamp(value?: string) {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('zh-CN', {
    hour12: false,
  });
}

function parseZone(zone?: string) {
  if (!zone) return null;
  const parts = zone.split('-').map((x) => x.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  return { from: parts[0], to: parts[1] };
}

function MetricCard({
  label,
  value,
  valueClassName = 'text-neutral-900',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className={`mt-2 text-sm font-semibold ${valueClassName}`}>{value}</div>
    </div>
  );
}

function ZoneBar({
  label,
  zone,
  tone,
}: {
  label: string;
  zone?: string;
  tone: 'support' | 'resistance';
}) {
  const parsed = parseZone(zone);

  const wrapClass =
    tone === 'support'
      ? 'border-emerald-200 bg-emerald-50'
      : 'border-rose-200 bg-rose-50';

  const barClass =
    tone === 'support'
      ? 'from-emerald-400 to-emerald-600'
      : 'from-rose-400 to-rose-600';

  const textClass =
    tone === 'support' ? 'text-emerald-700' : 'text-rose-700';

  return (
    <div className={`rounded-2xl border p-4 ${wrapClass}`}>
      <div className={`mb-3 text-sm font-semibold ${textClass}`}>{label}</div>

      {parsed ? (
        <>
          <div className="mb-3 h-3 overflow-hidden rounded-full bg-white">
            <div className={`h-full w-full rounded-full bg-gradient-to-r ${barClass}`} />
          </div>

          <div className="flex items-center justify-between text-xs font-medium text-neutral-600">
            <span>{formatNumber(parsed.from, 2)}</span>
            <span>{formatNumber(parsed.to, 2)}</span>
          </div>
        </>
      ) : (
        <div className="text-sm text-neutral-500">N/A</div>
      )}
    </div>
  );
}

function MarketCard({ data }: { data: MarketData }) {
  const change = Number(data.change24hPct);
  const changeClass = Number.isFinite(change)
    ? change >= 0
      ? 'text-green-600'
      : 'text-red-600'
    : 'text-neutral-900';

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 bg-gradient-to-r from-emerald-50 to-cyan-50 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Market Snapshot
            </div>
            <div className="mt-1 text-xl font-bold text-neutral-900">{data.symbol}</div>
          </div>

          <div className="text-right">
            <div className="text-xs text-neutral-500">最新价格</div>
            <div className="mt-1 text-2xl font-bold text-neutral-900">
              {formatNumber(data.price, 2)}
            </div>
            <div className={`mt-1 text-sm font-semibold ${changeClass}`}>
              {formatPercent(data.change24hPct)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="标记价格" value={formatNumber(data.markPrice, 2)} />
        <MetricCard
          label="24h 区间"
          value={`${formatNumber(data.low24h, 2)} - ${formatNumber(data.high24h, 2)}`}
        />
        <MetricCard
          label="资金费率"
          value={data.fundingRate ?? 'N/A'}
          valueClassName="text-blue-700"
        />
        <MetricCard label="24h 成交量" value={formatCompactNumber(data.volume24h)} />
        <MetricCard label="24h 成交额" value={formatCompactNumber(data.quoteVolume24h)} />
        <MetricCard label="持仓量" value={formatCompactNumber(data.openInterest)} />
      </div>

      <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
        <ZoneBar label="支撑区" zone={data.supportZone} tone="support" />
        <ZoneBar label="阻力区" zone={data.resistanceZone} tone="resistance" />
      </div>

      <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
        数据时间：{formatTimestamp(data.asOf)}
      </div>
    </div>
  );
}

export default function ToolPartCard({ part }: ToolPartCardProps) {
  const outputValue = part.output ?? part.result;
  const outputText = tryStringify(outputValue);
  const errorText = part.errorText || tryStringify(part.error);

  const state = part.state || '';

  const isError =
    state === 'output-error' ||
    state === 'error' ||
    Boolean(part.errorText) ||
    Boolean(part.error);

  const isDone =
    state === 'output-available' ||
    state === 'result' ||
    Boolean(part.output) ||
    Boolean(part.result);

  const isRunning = !isError && !isDone;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isError
          ? 'border-red-300 bg-red-50'
          : isDone
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-blue-300 bg-blue-50'
      }`}
    >
      <div className="mb-3 flex justify-end">
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            isError
              ? 'bg-red-100 text-red-700'
              : isDone
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-blue-100 text-blue-700'
          }`}
        >
          {isError ? '调用失败' : isDone ? '已完成' : '执行中'}
        </span>
      </div>

      {isDone && outputValue ? (
        isMarketData(outputValue) ? (
          <MarketCard data={outputValue} />
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Output
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-neutral-700">
              {outputText}
            </pre>
          </div>
        )
      ) : null}

      {isError && errorText ? (
        <div className="rounded-xl border border-red-200 bg-white p-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-500">
            Error
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-red-700">
            {errorText}
          </pre>
        </div>
      ) : null}

      {isRunning ? (
        <div className="rounded-2xl border border-blue-200 bg-white p-4">
          <div className="animate-pulse text-sm text-blue-700">
            正在获取实时数据，请稍候…
          </div>
        </div>
      ) : null}
    </div>
  );
}