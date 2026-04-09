type StrategyTableProps = {
  title: string;
  rows: string[];
  color: 'green' | 'red' | 'neutral';
};

type ParsedRow = {
  raw: string;
  label: string;
  value: string;
  level: number;
  kind: 'entry' | 'takeProfit' | 'stopLoss' | 'other';
};

function parseRow(row: string): ParsedRow {
  const [label, ...rest] = row.split('：');
  const value = rest.join('：').trim() || row;

  const levelMatch = label.match(/第([一二三四五六七八九十\d]+)(仓|止盈)/);
  const numericLevelMap: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };

  let level = 0;
  if (levelMatch) {
    const rawLevel = levelMatch[1];
    level =
      numericLevelMap[rawLevel] ??
      (Number.isFinite(Number(rawLevel)) ? Number(rawLevel) : 0);
  }

  let kind: ParsedRow['kind'] = 'other';
  if (label.includes('仓')) kind = 'entry';
  if (label.includes('止盈')) kind = 'takeProfit';
  if (label.includes('止损')) kind = 'stopLoss';

  return {
    raw: row,
    label: label.trim(),
    value,
    level,
    kind,
  };
}

function getPanelStyle(color: StrategyTableProps['color']) {
  if (color === 'green') {
    return {
      wrap: 'border-emerald-200 bg-emerald-50/70',
      head: 'text-emerald-800',
      chip: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      line: 'bg-emerald-500',
      card: 'border-emerald-200 bg-white',
      dot: 'bg-emerald-500',
    };
  }

  if (color === 'red') {
    return {
      wrap: 'border-rose-200 bg-rose-50/70',
      head: 'text-rose-800',
      chip: 'bg-rose-100 text-rose-700 border-rose-200',
      line: 'bg-rose-500',
      card: 'border-rose-200 bg-white',
      dot: 'bg-rose-500',
    };
  }

  return {
    wrap: 'border-neutral-200 bg-neutral-50/70',
    head: 'text-neutral-800',
    chip: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    line: 'bg-neutral-500',
    card: 'border-neutral-200 bg-white',
    dot: 'bg-neutral-500',
  };
}

function getRowAccent(kind: ParsedRow['kind']) {
  if (kind === 'entry') {
    return {
      badgeText: '进场',
      badgeClass: 'bg-sky-100 text-sky-700 border-sky-200',
    };
  }

  if (kind === 'takeProfit') {
    return {
      badgeText: '止盈',
      badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };
  }

  if (kind === 'stopLoss') {
    return {
      badgeText: '止损',
      badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
    };
  }

  return {
    badgeText: '信息',
    badgeClass: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  };
}

function extractPriceHint(value: string) {
  const matches = value.match(/\d[\d,.]*(?:\.\d+)?/g);
  if (!matches?.length) return null;

  if (matches.length >= 2) {
    return `${matches[0]} - ${matches[1]}`;
  }

  return matches[0];
}

export default function StrategyTable({
  title,
  rows,
  color,
}: StrategyTableProps) {
  if (!rows.length) return null;

  const parsedRows = rows.map(parseRow);
  const style = getPanelStyle(color);

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${style.wrap}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className={`text-sm font-bold ${style.head}`}>{title}</div>
          <div className="mt-1 text-xs text-neutral-500">
            共 {parsedRows.length} 项
          </div>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${style.chip}`}
        >
          {color === 'green' ? '目标区' : color === 'red' ? '风险区' : '执行区'}
        </span>
      </div>

      <div className="space-y-3">
        {parsedRows.map((row, index) => {
          const accent = getRowAccent(row.kind);
          const priceHint = extractPriceHint(row.value);

          return (
            <div key={`${row.raw}-${index}`} className="flex gap-3">
              <div className="flex w-7 flex-col items-center">
                <div className={`mt-2 h-2.5 w-2.5 rounded-full ${style.dot}`} />
                {index !== parsedRows.length - 1 ? (
                  <div className={`mt-1 w-px flex-1 ${style.line}`} />
                ) : null}
              </div>

              <div
                className={`flex-1 rounded-2xl border p-4 transition-all ${style.card}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${accent.badgeClass}`}
                    >
                      {accent.badgeText}
                    </span>

                    <span className="text-sm font-semibold text-neutral-900">
                      {row.label}
                    </span>

                    {row.level > 0 ? (
                      <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">
                        Level {row.level}
                      </span>
                    ) : null}
                  </div>

                  {priceHint ? (
                    <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
                      {priceHint}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 text-sm leading-6 text-neutral-700">
                  {row.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}