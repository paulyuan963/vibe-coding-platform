type AnalysisSectionProps = {
  title: string;
  content: string;
  variant?: 'default' | 'warning' | 'highlight';
};

export default function AnalysisSection({
  title,
  content,
  variant = 'default',
}: AnalysisSectionProps) {
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
      <div className={`whitespace-pre-wrap text-sm leading-6 ${bodyStyle}`}>
        {content}
      </div>
    </div>
  );
}