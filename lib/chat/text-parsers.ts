import type { ParsedBlock, StrategyCardData } from './message-types';
import { normalizeText } from './text-utils';

const STRATEGY_MARKERS = ['策略A：', '策略B：', '结论：'];

const ANALYSIS_MARKERS = [
  '1. 市场总览',
  '2. 技术面',
  '3. 衍生品与情绪',
  '4. 宏观与事件',
  '5. 分析师观点',
  '6. 接下来关注',
];

export function splitStrategyBlocks(text: string): ParsedBlock[] | null {
  const normalized = normalizeText(text);

  const found = STRATEGY_MARKERS
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

export function splitAnalysisBlocks(text: string): ParsedBlock[] | null {
  const normalized = normalizeText(text);

  const found = ANALYSIS_MARKERS
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

export function isStrategyText(text: string) {
  return text.includes('策略A：') || text.includes('策略B：');
}

export function isAnalysisText(text: string) {
  return (
    text.includes('1. 市场总览') ||
    text.includes('2. 技术面') ||
    text.includes('3. 衍生品与情绪')
  );
}

export function parseStrategyCard(block: ParsedBlock): StrategyCardData {
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