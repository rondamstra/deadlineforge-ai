interface WarningsListProps {
  warnings: string[];
}

export default function WarningsList({ warnings }: WarningsListProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <h3 className="text-sm font-semibold text-amber-800 mb-2">Warnings</h3>
      <ul className="list-disc list-inside space-y-1">
        {warnings.map((warning, index) => (
          <li key={index} className="text-sm text-amber-700">
            {warning}
          </li>
        ))}
      </ul>
    </div>
  );
}
