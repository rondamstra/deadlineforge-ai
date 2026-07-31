export default function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
      <h2 className="text-lg font-semibold text-gray-700">
        Ready to prioritize your day?
      </h2>
      <p className="mt-3 text-sm text-gray-500">
        Get started in three simple steps:
      </p>
      <ol className="mt-4 inline-block space-y-2 text-left text-sm text-gray-600">
        <li className="flex items-start gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700">
            1
          </span>
          <span>Paste or type your tasks in the text area above</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700">
            2
          </span>
          <span>Optionally set your available time for today</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700">
            3
          </span>
          <span>
            Click <strong>&quot;Prioritize My Tasks&quot;</strong> to get your
            AI-powered plan
          </span>
        </li>
      </ol>
    </div>
  );
}
