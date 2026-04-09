// lib/bybit.ts

export type MarketContext = {
  symbol: string;
  price: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  fundingRate: number | null;
  markPrice: number | null;
  openInterest: number | null;
  openInterestUsd: number | null;
  supportZone: string;
  resistanceZone: string;
  asOf: string;
};

const BASE_URL = process.env.BYBIT_API_BASE_URL || 'https://api.bybit.com';

type BybitResponse<T> = {
  retCode: number;
  retMsg: string;
  result: T;
  time: number;
};

type BybitTickerItem = {
  symbol: string;
  lastPrice: string;
  indexPrice?: string;
  markPrice?: string;
  prevPrice24h?: string;
  price24hPcnt?: string;
  highPrice24h?: string;
  lowPrice24h?: string;
  prevPrice1h?: string;
  openInterest?: string;
  openInterestValue?: string;
  turnover24h?: string;
  volume24h?: string;
  fundingRate?: string;
  nextFundingTime?: string;
};

type BybitTickersResult = {
  category: string;
  list: BybitTickerItem[];
};

type BybitFundingRateItem = {
  symbol: string;
  fundingRate: string;
  fundingRateTimestamp: string;
};

type BybitFundingRateResult = {
  category: string;
  list: BybitFundingRateItem[];
};

type BybitOpenInterestItem = {
  openInterest: string;
  timestamp: string;
};

type BybitOpenInterestResult = {
  category: string;
  symbol: string;
  list: BybitOpenInterestItem[];
  nextPageCursor?: string;
};

type BybitKlineResult = {
  category: string;
  symbol: string;
  list: string[][];
};

function round(num: number, digits = 2) {
  return Number(num.toFixed(digits));
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bybit API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

async function fetchBybit<T>(path: string): Promise<BybitResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const json = await fetchJson<BybitResponse<T>>(url);

  if (json.retCode !== 0) {
    throw new Error(`Bybit API retCode ${json.retCode}: ${json.retMsg}`);
  }

  return json;
}

function deriveZonesFromKlines(klines: string[][]) {
  if (!klines.length) {
    return {
      supportZone: '暂无可靠支撑区间',
      resistanceZone: '暂无可靠阻力区间',
    };
  }

  // Bybit kline list is reverse-sorted by startTime
  const lows = klines.map((k) => Number(k[3])).filter(Number.isFinite);
  const highs = klines.map((k) => Number(k[2])).filter(Number.isFinite);

  if (!lows.length || !highs.length) {
    return {
      supportZone: '暂无可靠支撑区间',
      resistanceZone: '暂无可靠阻力区间',
    };
  }

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

function toLinearSymbol(rawSymbol: string) {
  return rawSymbol.toUpperCase();
}

export async function getBybitMarketContext(rawSymbol: string): Promise<MarketContext> {
  const symbol = toLinearSymbol(rawSymbol);

  const now = Date.now();
  const startTime = now - 24 * 60 * 60 * 1000;

  const [tickerRes, fundingRes, oiRes, klineRes] = await Promise.all([
    fetchBybit<BybitTickersResult>(
      `/v5/market/tickers?category=linear&symbol=${encodeURIComponent(symbol)}`
    ),
    fetchBybit<BybitFundingRateResult>(
      `/v5/market/funding/history?category=linear&symbol=${encodeURIComponent(symbol)}&limit=1`
    ),
    fetchBybit<BybitOpenInterestResult>(
      `/v5/market/open-interest?category=linear&symbol=${encodeURIComponent(
        symbol
      )}&intervalTime=5min&limit=1`
    ),
    fetchBybit<BybitKlineResult>(
      `/v5/market/kline?category=linear&symbol=${encodeURIComponent(
        symbol
      )}&interval=60&start=${startTime}&end=${now}&limit=24`
    ),
  ]);

  const ticker = tickerRes.result.list?.[0];
  if (!ticker) {
    throw new Error(`No Bybit ticker data found for ${symbol}`);
  }

  const funding = fundingRes.result.list?.[0];
  const oiItem = oiRes.result.list?.[0];

  const price = Number(ticker.lastPrice);
  const markPrice = ticker.markPrice ? Number(ticker.markPrice) : null;
  const openInterest = oiItem?.openInterest
    ? Number(oiItem.openInterest)
    : ticker.openInterest
    ? Number(ticker.openInterest)
    : null;

  const openInterestUsd =
    ticker.openInterestValue && Number.isFinite(Number(ticker.openInterestValue))
      ? Number(ticker.openInterestValue)
      : openInterest && markPrice
      ? openInterest * markPrice
      : null;

  const fundingRate =
    funding?.fundingRate != null
      ? Number(funding.fundingRate)
      : ticker.fundingRate != null
      ? Number(ticker.fundingRate)
      : null;

  const zones = deriveZonesFromKlines(klineRes.result.list || []);

  const asOf = new Date(
    Math.max(
      tickerRes.time || 0,
      fundingRes.time || 0,
      oiRes.time || 0,
      klineRes.time || 0
    )
  ).toISOString();

  return {
    symbol,
    price,
    change24hPct: ticker.price24hPcnt ? Number(ticker.price24hPcnt) * 100 : 0,
    high24h: ticker.highPrice24h ? Number(ticker.highPrice24h) : price,
    low24h: ticker.lowPrice24h ? Number(ticker.lowPrice24h) : price,
    volume24h: ticker.volume24h ? Number(ticker.volume24h) : 0,
    quoteVolume24h: ticker.turnover24h ? Number(ticker.turnover24h) : 0,
    fundingRate,
    markPrice,
    openInterest,
    openInterestUsd,
    supportZone: zones.supportZone,
    resistanceZone: zones.resistanceZone,
    asOf,
  };
}