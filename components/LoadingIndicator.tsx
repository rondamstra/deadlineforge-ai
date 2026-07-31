export default function LoadingIndicator() {
  return (
    <div className="flex flex-col items-center justify-center py-12" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      <p className="mt-4 text-sm text-gray-600">Prioritizing your tasks...</p>
    </div>
  );
}
