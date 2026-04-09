import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type InferUITools,
  type ToolSet,
  type UIDataTypes,
  type UIMessage,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { getBybitMarketContext } from '../../../lib/bybit';

export const maxDuration = 30;

type ChatMode = 'strategy' | 'analysis';

const DEFAULT_SYMBOL = 'BTCUSDT';
const REFERENCE_SYMBOL = 'BTCUSDT';
const MODEL_NAME = 'gpt-4.1-mini';

const SYMBOL_KEYWORDS: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  BNB: 'BNBUSDT',
  DOGE: 'DOGEUSDT',
  XRP: 'XRPUSDT',
};

const STRATEGY_KEYWORDS = [
  '策略',
  '日内',
  '布局',
  '条件单',
  '挂单',
  '做多',
  '做空',
  '止盈',
  '止损',
  '回调做多',
  '冲高做空',
  '今天怎么做',
  '开单',
  '仓位',
  'strategy',
];

const ANALYSIS_KEYWORDS = [
  '行情',
  '分析',
  '日报',
  '周报',
  '月报',
  '走势',
  '市场',
  '技术面',
  '宏观',
  'etf',
  '情绪',
  '链上',
  'fear greed',
  '资金费率',
  '分析一下',
  '怎么看',
  'market',
  'report',
  'daily',
  'weekly',
  'monthly',
];

const BASE_SYSTEM_PROMPT = `
你是一个“Crypto Analyst / 加密货币市场分析专家”。

你负责两类输出：

【模式A：日内策略模式】
适用于用户提问：
- 今天怎么做
- 日内布局
- 条件单
- 挂单点位
- 回调做多还是冲高做空
- 策略A / 策略B
- 止盈止损怎么设

【模式B：市场分析模式】
适用于用户提问：
- 今天行情如何
- BTC怎么样
- 给我日报 / 周报 / 月报
- 分析某个币
- 技术面分析
- 链上数据
- 市场情绪
- ETF / 宏观 / 稳定币 / DeFi / Meme coin

【总规则】
1. 必须使用中文输出。
2. 必须专业、客观、简洁。
3. 不得承诺收益，不得使用“稳赚、必涨、必跌、无风险”等表述。
4. 必须包含风险提示。
5. 若数据不足，必须明确说明“数据不足”，不得编造。
6. 可使用“偏多、偏空、偏震荡、突破确认后更优、回踩确认更优”等措辞。
7. 如果用户问“该不该买 / 该不该开单”，不要直接给买卖建议，而要给：
   - 看多条件
   - 看空风险
   - 关键触发位
   - 风控建议
8. 不要输出 JSON。
9. 不要输出 markdown 代码块。
10. 输出必须适合前端直接渲染。
11. 你可以根据需要调用工具获取实时市场数据。
12. 如果分析的是山寨币，优先额外调用 BTCUSDT 作为大盘参考。
`;

const STRATEGY_PROMPT = `
你当前处于【模式A：日内策略模式】。

你的任务是根据工具返回的实时市场数据，输出结构化的日内策略。

【策略模式输出模板】
{币种} 日内策略（{日期}）

策略A：{策略名称}
胜率参考：{偏高/中性/偏低/突破确认后更优}

仓位思路：
{一句到两句，强调总风险控制、分批进场、不追高}

第一仓：挂 {价格/区间/说明}
第二仓：挂 {价格/区间/说明}
第三仓：挂 {价格/区间/说明，可选}

第一止盈：{价格/区间/说明}
第二止盈：{价格/区间/说明}
第三止盈：{价格/区间/说明}

止损：{价格/区间/说明}

逻辑：
{2~4句，结合支撑阻力、成交量、资金费率、持仓量、波动、宏观背景等}

策略B：{策略名称}
胜率参考：{偏高/中性/偏低/突破确认后更优}

仓位思路：
{一句到两句}

第一仓：挂 {价格/区间/说明}
第二仓：挂 {价格/区间/说明}
第三仓：挂 {价格/区间/说明，可选}

第一止盈：{价格/区间/说明}
第二止盈：{价格/区间/说明}
第三止盈：{价格/区间/说明}

止损：{价格/区间/说明}

逻辑：
{2~4句}

结论：
{今天更优先哪套策略；什么条件下执行；什么情况下观望}

风险提示：
⚠️ 本内容仅供参考，不构成任何投资建议。加密货币市场波动极高，请严格设置止损并控制仓位。
`;

const ANALYSIS_PROMPT = `
你当前处于【模式B：市场分析模式】。

你的任务是根据工具返回的实时市场数据，输出结构化市场分析报告。

【分析模式输出模板】
📊 加密货币市场分析
📅 日期：{YYYY-MM-DD}
🎯 标的：{币种}

1. 市场总览
- 当前判断：{偏多 / 偏空 / 震荡}
- 当前价格与24h涨跌幅
- 24h高低点
- 成交量与市场活跃度变化

2. 技术面
- 当前所处区间
- 关键支撑位 / 阻力位
- 短线走势判断

3. 衍生品与情绪
- 资金费率
- 持仓量变化意义
- 多空情绪倾向
- 是否存在逼空 / 多杀多 / 高杠杆拥挤风险

4. 宏观与事件
- 当前市场需要关注的宏观因素
- ETF / 美元指数 / 风险资产联动的可能影响
- 如果没有明确事件，不要编造新闻

5. 分析师观点
看多理由：
- {列2~4条}

看空理由：
- {列2~4条}

中性观察点：
- {列2~4条}

6. 接下来关注
- 未来24小时关注点
- 未来7天关注点

7. 风险提示
⚠️ 本报告仅供参考，不构成任何投资建议。加密货币市场波动性极高，请根据自身风险承受能力做出投资决策。
`;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function formatNullableNumber(value: number | null, digits = 2) {
  return value == null || !Number.isFinite(value) ? 'N/A' : value.toFixed(digits);
}

function extractTextFromMessages(messages: ChatMessage[]): string {
  return messages
    .flatMap(message =>
      Array.isArray(message.parts)
        ? message.parts
            .filter(part => part.type === 'text')
            .map(part => String(part.text || ''))
        : []
    )
    .join(' ')
    .trim();
}

function detectSymbolFromMessages(messages: ChatMessage[]): string {
  const text = extractTextFromMessages(messages).toUpperCase();

  for (const [keyword, symbol] of Object.entries(SYMBOL_KEYWORDS)) {
    if (text.includes(keyword)) return symbol;
  }

  return DEFAULT_SYMBOL;
}

function scoreKeywords(text: string, keywords: string[]) {
  return keywords.reduce((score, keyword) => {
    return score + (text.includes(keyword) ? 1 : 0);
  }, 0);
}

function detectModeFromMessages(messages: ChatMessage[]): ChatMode {
  const text = extractTextFromMessages(messages).toLowerCase();
  const strategyScore = scoreKeywords(text, STRATEGY_KEYWORDS);
  const analysisScore = scoreKeywords(text, ANALYSIS_KEYWORDS);
  return strategyScore > analysisScore ? 'strategy' : 'analysis';
}

function summarizeMarketContext(market: Awaited<ReturnType<typeof getBybitMarketContext>>) {
  return {
    symbol: market.symbol,
    price: formatNullableNumber(market.price, 2),
    markPrice: formatNullableNumber(market.markPrice, 2),
    change24hPct: formatNullableNumber(market.change24hPct, 2),
    high24h: formatNullableNumber(market.high24h, 2),
    low24h: formatNullableNumber(market.low24h, 2),
    volume24h: formatNullableNumber(market.volume24h, 2),
    quoteVolume24h: formatNullableNumber(market.quoteVolume24h, 2),
    fundingRate: formatNullableNumber(market.fundingRate, 6),
    openInterest: formatNullableNumber(market.openInterest, 2),
    openInterestUsd: formatNullableNumber(market.openInterestUsd, 2),
    supportZone: market.supportZone,
    resistanceZone: market.resistanceZone,
    asOf: market.asOf,
  };
}

async function fetchMarketSummary(symbol: string) {
  const market = await getBybitMarketContext(symbol);
  return summarizeMarketContext(market);
}

const tools = {
  getMarketSnapshot: tool({
    description: '获取单个交易对的实时合约市场数据。',
    inputSchema: z.object({
      symbol: z.string().describe('交易对，例如 BTCUSDT、ETHUSDT、SOLUSDT'),
    }),
    execute: async ({ symbol }) => {
      return fetchMarketSummary(symbol);
    },
  }),

  getReferenceMarket: tool({
    description: '获取 BTCUSDT 大盘参考数据。',
    inputSchema: z.object({
      symbol: z.string().default(REFERENCE_SYMBOL),
    }),
    execute: async ({ symbol }) => {
      return fetchMarketSummary(symbol || REFERENCE_SYMBOL);
    },
  }),
} satisfies ToolSet;

export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;

function buildSystemPrompt(symbol: string, mode: ChatMode) {
  const modePrompt = mode === 'strategy' ? STRATEGY_PROMPT : ANALYSIS_PROMPT;

  const orchestrationPrompt = `
当前默认分析标的：${symbol}
当前输出模式：${mode}

工具使用要求：
1. 先调用 getMarketSnapshot 获取当前标的实时数据。
2. 如果当前标的不是 BTCUSDT，且需要判断大盘背景、风险偏好、联动性或市场强弱，再调用 getReferenceMarket 获取 BTCUSDT 数据。
3. 获取工具结果后，再输出最终结论。
4. 如果工具结果不足，请明确说明“数据不足”。
5. 不要跳过工具直接臆测实时数据。
`;

  return `${BASE_SYSTEM_PROMPT}\n\n${modePrompt}\n\n${orchestrationPrompt}`;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return jsonResponse({ error: 'Missing OPENAI_API_KEY' }, 500);
    }

    const { messages }: { messages: ChatMessage[] } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: 'Missing or invalid messages' }, 400);
    }

    const symbol = detectSymbolFromMessages(messages);
    const mode = detectModeFromMessages(messages);
    const system = buildSystemPrompt(symbol, mode);

    const result = streamText({
      model: openai(MODEL_NAME),
      system,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(5),
      temperature: 0.4,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('chat route error:', error);

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Server error',
      },
      500
    );
  }
}