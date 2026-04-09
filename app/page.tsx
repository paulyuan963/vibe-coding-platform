'use client';

import { useChat } from '@ai-sdk/react';
import { useMemo, useState } from 'react';

type ParsedBlock = {
  title: string;
  content: string;
};

type StrategyCardData = {
  title: string;
  confidence?: string;
  positionIdea?: string;
  entries: string[];
  takeProfits: string[];
  stopLoss?: string;
  logic?: string;
};

function normalizeText(text: string) {
  return text.replace(/\r\n/g, '\n').trim();
}

function splitStrategyBlocks(text: string): ParsedBlock[] | null {
  const normalized = normalizeText(text);
  const markers = ['策略A：', '策略B：', '结论：'];

  const found = markers
    .map((marker) => ({
      marker,
      index: normalized.indexOf(marker),
    }))
    .filter((x) => x.index !== -1)
    .sort((a, b) => a.index - b.index);

  if (!found.length) return null;

  const blocks: ParsedBlock[] = [];

  for (let i = 0; i < found.length; i++) {
    const current = found[i];
    const next = found[i + 1];
    const start = current.index;
    const end = next ? next.index : normalized.length;
    const chunk = normalized.slice(start, end).trim();

    blocks.push({
      title: current.marker.replace('：', ''),
      content: chunk.replace(current.marker, '').trim(),
    });
  }

  return blocks;
}

function splitAnalysisBlocks(text: string): ParsedBlock[] | null {
  const normalized = normalizeText(text);

  const markers = [
    '1. 市场总览',
    '2. 技术面',
    '3. 衍生品与情绪',
    '4. 宏观与事件',
    '5. 分析师观点',
    '6. 接下来关注',
  ];

  const found = markers
    .map((marker) => ({
      marker,
      index: normalized.indexOf(marker),
    }))
    .filter((x) => x.index !== -1)
    .sort((a, b) => a.index - b.index);

  if (!found.length) return null;

  const blocks: ParsedBlock[] = [];

  for (let i = 0; i < found.length; i++) {
    const current = found[i];
    const next = found[i + 1];
    const start = current.index;
    const end = next ? next.index : normalized.length;
    const chunk = normalized.slice(start, end).trim();

    blocks.push({
      title: current.marker,
      content: chunk.replace(current.marker, '').trim(),
    });
  }

  return blocks;
}

function isStrategyText(text: string) {
  return text.includes('策略A：') || text.includes('策略B：');
}

function isAnalysisText(text: string) {
  return (
    text.includes('1. 市场总览') ||
    text.includes('2. 技术面') ||
    text.includes('3. 衍生品与情绪')
  );
}

function parseStrategyCard(block: ParsedBlock): StrategyCardData {
  const lines = block.content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const entries: string[] = [];
  const takeProfits: string[] = [];
  let confidence = '';
  let positionIdea = '';
  let stopLoss = '';
  const logicLines: string[] = [];
  let strategyName = '';

  if (lines.length > 0) {
    strategyName = lines[0];
  }

  let inPositionIdea = false;
  let inLogic = false;

  for (const line of lines.slice(1)) {
    if (line.startsWith('胜率参考')) {
      confidence = line.replace('胜率参考：', '').trim();
      inPositionIdea = false;
      inLogic = false;
      continue;
    }

    if (line.startsWith('仓位思路')) {
      inPositionIdea = true;
      inLogic = false;
      const after = line.replace('仓位思路：', '').trim();
      if (after) positionIdea += `${positionIdea ? '\n' : ''}${after}`;
      continue;
    }

    if (line.startsWith('逻辑')) {
      inLogic = true;
      inPositionIdea = false;
      const after = line.replace('逻辑：', '').trim();
      if (after) logicLines.push(after);
      continue;
    }

    if (
      line.startsWith('第一仓') ||
      line.startsWith('第二仓') ||
      line.startsWith('第三仓')
    ) {
      entries.push(line);
      inPositionIdea = false;
      inLogic = false;
      continue;
    }

    if (
      line.startsWith('第一止盈') ||
      line.startsWith('第二止盈') ||
      line.startsWith('第三止盈')
    ) {
      takeProfits.push(line);
      inPositionIdea = false;
      inLogic = false;
      continue;
    }

    if (line.startsWith('止损')) {
      stopLoss = line;
      inPositionIdea = false;
      inLogic = false;
      continue;
    }

    if (inPositionIdea) {
      positionIdea += `${positionIdea ? '\n' : ''}${line}`;
      continue;
    }

    if (inLogic) {
      logicLines.push(line);
      continue;
    }
  }

  return {
    title: strategyName || block.title,
    confidence,
    positionIdea,
    entries,
    takeProfits,
    stopLoss,
    logic: logicLines.join('\n'),
  };
}

function StrategyTable({
  title,
  rows,
  color,
}: {
  title: string;
  rows: string[];
  color: 'green' | 'red' | 'neutral';
}) {
  if (!rows.length) return null;

  const badgeClass =
    color === 'green'
      ? 'bg-green-100 text-green-700'
      : color === 'red'
      ? 'bg-red-100 text-red-700'
      : 'bg-neutral-100 text-neutral-700';

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 text-sm font-semibold text-neutral-900">{title}</div>

      <div className="overflow-hidden rounded-xl border border-neutral-200">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">层级</th>
              <th className="px-3 py-2 text-left font-medium">内容</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const [label, ...rest] = row.split('：');
              return (
                <tr key={`${title}-${i}`} className="border-t border-neutral-200">
                  <td className="px-3 py-3 align-top">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}`}>
                      {label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-neutral-800">{rest.join('：') || row}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StrategyCard({ block }: { block: ParsedBlock }) {
  const data = parseStrategyCard(block);

  const theme =
    block.title === '策略A'
      ? {
          wrap: 'border-green-200 bg-green-50/50',
          tag: 'bg-green-100 text-green-700',
        }
      : {
          wrap: 'border-red-200 bg-red-50/50',
          tag: 'bg-red-100 text-red-700',
        };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${theme.wrap}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {block.title}
          </div>
          <div className="mt-1 text-lg font-bold text-neutral-900">{data.title}</div>
        </div>

        {data.confidence ? (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${theme.tag}`}>
            胜率参考：{data.confidence}
          </span>
        ) : null}
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

function AnalysisSection({
  title,
  content,
  variant = 'default',
}: {
  title: string;
  content: string;
  variant?: 'default' | 'warning' | 'highlight';
}) {
  const style =
    variant === 'warning'
      ? 'border-red-300 bg-red-50'
      : variant === 'highlight'
      ? 'border-amber-300 bg-amber-50'
      : 'border-neutral-200 bg-white';

  const titleStyle =
    variant === 'warning'
      ? 'text-red-700'
      : variant === 'highlight'
      ? 'text-amber-900'
      : 'text-neutral-900';

  const bodyStyle =
    variant === 'warning'
      ? 'text-red-700'
      : variant === 'highlight'
      ? 'text-amber-900'
      : 'text-neutral-700';

  return (
    <div className={`rounded-2xl border p-4 ${style}`}>
      <div className={`mb-2 text-sm font-semibold ${titleStyle}`}>{title}</div>
      <div className={`whitespace-pre-wrap text-sm leading-6 ${bodyStyle}`}>{content}</div>
    </div>
  );
}

function AnalysisMessage({ text }: { text: string }) {
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
        const variant =
            block.title === '5. 分析师观点'
            ? 'highlight'
            : 'default';

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

function StrategyMessage({ text }: { text: string }) {
  const blocks = useMemo(() => splitStrategyBlocks(text), [text]);

  if (!blocks) {
    return (
      <div className="rounded-2xl border border-blue-100 bg-white p-4 font-medium whitespace-pre-wrap">
        {text || '...'}
      </div>
    );
  }

  const strategyA = blocks.find((b) => b.title === '策略A');
  const strategyB = blocks.find((b) => b.title === '策略B');
  const conclusion = blocks.find((b) => b.title === '结论');

  const strategyHeaderIndex = text.search(/\n?策略A：/);
  const header = strategyHeaderIndex > 0 ? text.slice(0, strategyHeaderIndex).trim() : '';

  return (
    <div className="space-y-4">
      {header ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="text-lg font-bold text-neutral-900">{header}</div>
        </div>
      ) : null}

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

function AssistantMessage({ text }: { text: string }) {
  if (isStrategyText(text)) {
    return <StrategyMessage text={text} />;
  }

  if (isAnalysisText(text)) {
    return <AnalysisMessage text={text} />;
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 font-medium whitespace-pre-wrap">
      {text || '...'}
    </div>
  );
}

export default function HomePage() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error } = useChat();

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
              支持两种输出模式：日内策略模式与市场分析模式。可用于结构化策略布局、
              止盈止损规划，以及行情分析、技术面与衍生品风险解读。
            </p>
          </div>
        </header>

        <section className="flex-1 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
          {messages.length === 0 ? (
            <div className="space-y-6">

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    策略模式
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-neutral-700">
                    <div className="rounded-xl bg-white px-3 py-3">
                      给我 BTC 今天的日内条件单布局
                    </div>
                    <div className="rounded-xl bg-white px-3 py-3">
                      ETH 今天适合回调做多还是冲高做空？
                    </div>
                    <div className="rounded-xl bg-white px-3 py-3">
                      给我今天 BTC 的策略A和策略B
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    分析模式
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-neutral-700">
                    <div className="rounded-xl bg-white px-3 py-3">分析一下 BTC 今天行情</div>
                    <div className="rounded-xl bg-white px-3 py-3">给我 ETH 日报</div>
                    <div className="rounded-xl bg-white px-3 py-3">SOL 当前市场情绪怎么样</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((message) => {
                const isUser = message.role === 'user';

                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
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
                        {message.parts.map((part, index) => {
                          if (part.type !== 'text') return null;

                          if (isUser) {
                            return (
                              <div
                                key={`${message.id}-${index}`}
                                className="whitespace-pre-wrap rounded-2xl"
                              >
                                {part.text || '...'}
                              </div>
                            );
                          }

                          return (
                            <AssistantMessage
                              key={`${message.id}-${index}`}
                              text={part.text || ''}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {error ? (
                <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                  出错了：{error.message}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <form
          onSubmit={onSubmit}
          className="sticky bottom-0 mt-6 rounded-3xl border border-neutral-200 bg-white p-3 shadow-sm"
        >
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              className="flex-1 rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-500"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入你的问题，例如：给我 BTC 今天的日内条件单布局 / 分析一下 BTC 今天行情"
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? '思考中...' : '发送'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}