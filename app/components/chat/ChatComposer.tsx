type ChatComposerProps = {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
};

export default function ChatComposer({
  input,
  setInput,
  onSubmit,
  isLoading,
}: ChatComposerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="sticky bottom-0 mt-6 rounded-3xl border border-neutral-200 bg-white p-3 shadow-sm"
    >
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          className="flex-1 rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入你的问题，例如：给我 BTC 今天的日内条件单布局 / 分析一下 ETH 今天行情"
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
  );
}