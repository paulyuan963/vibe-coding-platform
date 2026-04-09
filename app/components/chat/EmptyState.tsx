export default function EmptyState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            策略模式示例
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
            分析模式示例
          </p>
          <div className="mt-3 space-y-2 text-sm text-neutral-700">
            <div className="rounded-xl bg-white px-3 py-3">分析一下 BTC 今天行情</div>
            <div className="rounded-xl bg-white px-3 py-3">给我 ETH 日报</div>
            <div className="rounded-xl bg-white px-3 py-3">SOL 当前市场情绪怎么样</div>
          </div>
        </div>
      </div>
    </div>
  );
}