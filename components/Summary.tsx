interface SummaryProps {
  summary: string;
}

export default function Summary({ summary }: SummaryProps) {
  return (
    <p className="text-lg text-gray-700 leading-relaxed">{summary}</p>
  );
}
