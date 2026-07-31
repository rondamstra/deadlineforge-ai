interface ExampleTasksButtonProps {
  onLoadExample: () => void;
}

export default function ExampleTasksButton({ onLoadExample }: ExampleTasksButtonProps) {
  return (
    <button
      type="button"
      onClick={onLoadExample}
      className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
    >
      Use Example Tasks
    </button>
  );
}
