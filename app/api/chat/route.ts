import { convertToModelMessages, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getBinanceMarketContext } from '../../../lib/binance';

export const maxDuration = 30;

type ChatMode = 'strategy' | 'analysis';

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
`;

const STRATEGY_PROMPT = `
你当前处于【模式A：日内策略模式】。

你的任务是根据提供的市场数据，输出结构化的日内策略。

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

【策略模式额外规则】
1. 优先输出：
   - 策略A：回调做多
   - 策略B：冲高做空
   除非市场明显只支持单边逻辑。
2. 如果数据不足以支持精确价格位，可以输出区间挂单，而不是单点。
3. 如果缺乏可靠回测依据，不要写具体胜率百分比。
4. 如果波动异常，增加一行：
   ⚡ 高波动预警：当前波动异常，建议缩小仓位并等待确认。
5. 必须保留这些字段：
   - 策略A
   - 策略B
   - 结论
   - 风险提示
`;

const ANALYSIS_PROMPT = `
你当前处于【模式B：市场分析模式】。

你的任务是根据提供的市场数据，输出结构化市场分析报告。

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
- 若数据不足，不要硬写 RSI / MACD / 布林带

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

【分析模式额外规则】
1. 用户问具体币种时，聚焦该币种，但也可简要补充 BTC 大盘背景。
2. 用户问“该不该买”，不要直接给买卖建议，要给多空条件和关键位。
3. 用户问 ETH，可适当补充 Gas、质押、生态活跃度。
4. 用户问 SOL，可适当补充链上活跃、TPS、生态热度。
5. 用户问 meme coin，必须强调高波动、情绪驱动和高回撤风险。
`;

function extractTextFromMessages(messages: any[]): string {
  return messages
    .flatMap((m) =>
      Array.isArray(m.parts)
        ? m.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => String(p.text || ''))
        : []
    )
    .join(' ');
}

function detectSymbolFromMessages(messages: any[]): string {
  const text = extractTextFromMessages(messages).toUpperCase();

  if (text.includes('ETH')) return 'ETHUSDT';
  if (text.includes('SOL')) return 'SOLUSDT';
  if (text.includes('BNB')) return 'BNBUSDT';
  if (text.includes('DOGE')) return 'DOGEUSDT';
  if (text.includes('XRP')) return 'XRPUSDT';
  return 'BTCUSDT';
}

function detectModeFromMessages(messages: any[]): ChatMode {
  const text = extractTextFromMessages(messages).toLowerCase();

  const strategyKeywords = [
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

  const analysisKeywords = [
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

  const strategyScore = strategyKeywords.reduce(
    (acc, kw) => acc + (text.includes(kw) ? 1 : 0),
    0
  );
  const analysisScore = analysisKeywords.reduce(
    (acc, kw) => acc + (text.includes(kw) ? 1 : 0),
    0
  );

  if (strategyScore > analysisScore) return 'strategy';
  return 'analysis';
}

function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return 'N/A';
  return value.toFixed(digits);
}

function buildMarketContext(market: Awaited<ReturnType<typeof getBinanceMarketContext>>) {
  return `
以下是实时市场数据，请必须参考，不得忽略：

- 交易对：${market.symbol}
- 当前价格：${formatNumber(market.price, 2)}
- 标记价格：${formatNumber(market.markPrice, 2)}
- 24h涨跌幅：${formatNumber(market.change24hPct, 2)}%
- 24h最高：${formatNumber(market.high24h, 2)}
- 24h最低：${formatNumber(market.low24h, 2)}
- 24h成交量：${formatNumber(market.volume24h, 2)}
- 24h成交额：${formatNumber(market.quoteVolume24h, 2)}
- 当前资金费率：${market.fundingRate}
- 当前持仓量：${formatNumber(market.openInterest, 2)}
- 当前持仓量估算（USD）：${formatNumber(market.openInterestUsd, 2)}
- 近24根1小时K线推导支撑区间：${market.supportZone}
- 近24根1小时K线推导阻力区间：${market.resistanceZone}
- 数据时间：${market.asOf}

使用要求：
1. 你的分析必须以这些数据为基础。
2. 如果这些数据只能支持区间判断，就输出区间，不要假装精确。
3. 如果用户问的是策略，重点围绕支撑阻力、波动、资金费率、持仓量做条件单布局。
4. 如果用户问的是分析，重点围绕趋势、情绪、衍生品风险、关键位做结构化报告。
5. 如果没有足够宏观或新闻数据，不要编造具体事件，可以写“当前未提供明确宏观事件上下文”。
`;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages } = await req.json();

    const symbol = detectSymbolFromMessages(messages);
    const mode = detectModeFromMessages(messages);
    const market = await getBinanceMarketContext(symbol);

    const modePrompt = mode === 'strategy' ? STRATEGY_PROMPT : ANALYSIS_PROMPT;
    const marketContext = buildMarketContext(market);

    const result = streamText({
      model: openai('gpt-4.1-mini'),
      system: `${BASE_SYSTEM_PROMPT}\n\n${modePrompt}\n\n${marketContext}`,
      messages: await convertToModelMessages(messages),
      maxSteps: 1,
      temperature: 0.4,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('chat route error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}