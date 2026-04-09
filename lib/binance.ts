// lib/binance.ts
export type MarketContext = {
  symbol: string;
  price: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  fundingRate: number;
  markPrice: number;
  openInterest: number;
  openInterestUsd: number;
  supportZone: string;
  resistanceZone: string;
  asOf: string;
};

const BASE_URL =
  process.env.BINANCE_FUTURES_BASE_URL || 'https://fapi.binance.com';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Binance API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

type Ticker24hResponse = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  closeTime: number;
};

type PremiumIndexResponse = {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  estimatedSettlePrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
  time: number;
};

type OpenInterestResponse = {
  openInterest: string;
  symbol: string;
  time: number;
};

type KlineRow = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string
];

function round(num: number, digits = 2) {
  return Number(num.toFixed(digits));
}

function deriveZonesFromKlines(klines: KlineRow[]) {
  if (!klines.length) {
    return {
      supportZone: '暂无可靠支撑区间',
      resistanceZone: '暂无可靠阻力区间',
    };
  }

  const lows = klines.map((k) => Number(k[3]));
  const highs = klines.map((k) => Number(k[2]));

  const sortedLows = [...lows].sort((a, b) => a - b);
  const sortedHighs = [...highs].sort((a, b) => b - a);

  const supportLow = sortedLows[Math.min(1, sortedLows.length - 1)];
  const supportHigh = sortedLows[Math.min(3, sortedLows.length - 1)];
  const resistanceHigh = sortedHighs[Math.min(1, sortedHighs.length - 1)];
  const resistanceLow = sortedHighs[Math.min(3, sortedHighs.length - 1)];

  return {
    supportZone: `${round(Math.min(supportLow, supportHigh), 0)}-${round(
      Math.max(supportLow, supportHigh),
      0
    )}`,
    resistanceZone: `${round(Math.min(resistanceLow, resistanceHigh), 0)}-${round(
      Math.max(resistanceLow, resistanceHigh),
      0
    )}`,
  };
}

export async function getBinanceMarketContext(
  rawSymbol: string
): Promise<MarketContext> {
  const symbol = rawSymbol.toUpperCase();

  const [ticker24h, premiumIndex, openInterest, klines] = await Promise.all([
    fetchJson<Ticker24hResponse>(
      `${BASE_URL}/fapi/v1/ticker/24hr?symbol=${encodeURIComponent(symbol)}`
    ),
    fetchJson<PremiumIndexResponse>(
      `${BASE_URL}/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`
    ),
    fetchJson<OpenInterestResponse>(
      `${BASE_URL}/fapi/v1/openInterest?symbol=${encodeURIComponent(symbol)}`
    ),
    fetchJson<KlineRow[]>(
      `${BASE_URL}/fapi/v1/klines?symbol=${encodeURIComponent(
        symbol
      )}&interval=1h&limit=24`
    ),
  ]);

  const lastPrice = Number(ticker24h.lastPrice);
  const oi = Number(openInterest.openInterest);
  const oiUsd = oi * Number(premiumIndex.markPrice);
  const zones = deriveZonesFromKlines(klines);

  return {
    symbol,
    price: lastPrice,
    change24hPct: Number(ticker24h.priceChangePercent),
    high24h: Number(ticker24h.highPrice),
    low24h: Number(ticker24h.lowPrice),
    volume24h: Number(ticker24h.volume),
    quoteVolume24h: Number(ticker24h.quoteVolume),
    fundingRate: Number(premiumIndex.lastFundingRate),
    markPrice: Number(premiumIndex.markPrice),
    openInterest: oi,
    openInterestUsd: oiUsd,
    supportZone: zones.supportZone,
    resistanceZone: zones.resistanceZone,
    asOf: new Date(
      Math.max(ticker24h.closeTime || 0, premiumIndex.time || 0, openInterest.time || 0)
    ).toISOString(),
  };
}