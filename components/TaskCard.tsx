import { z } from "zod";
import { PrioritizedTaskSchema } from "@/lib/schemas";

type PrioritizedTask = z.infer<typeof PrioritizedTaskSchema>;

interface TaskCardProps {
  task: PrioritizedTask;
}

const urgencyColors: Record<PrioritizedTask["urgency"], string> = {
  Critical: "bg-red-100 text-red-800",
  High: "bg-orange-100 text-orange-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-green-100 text-green-800",
};

export default function TaskCard({ task }: TaskCardProps) {
  const isDeferred = task.allocatedMinutesToday === 0;

  return (
    <div
      className={`rounded-lg border p-4 shadow-sm ${
        isDeferred ? "border-gray-300 bg-gray-50 opacity-75" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Rank */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
          {task.rank}
        </div>

        <div className="flex-1 space-y-2">
          {/* Header row: urgency badge + deferred indicator */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${urgencyColors[task.urgency]}`}
            >
              {task.urgency}
            </span>
            {isDeferred && (
              <span className="inline-block rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                Deferred
              </span>
            )}
          </div>

          {/* Task description */}
          <p className="text-sm font-medium text-gray-900">{task.taskDescription}</p>

          {/* Reason */}
          <p className="text-sm text-gray-600">{task.reason}</p>

          {/* Duration and allocation */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span>
              Estimated:{" "}
              {task.estimatedDurationMinutes !== null
                ? `${task.estimatedDurationMinutes} min`
                : "Not provided"}
            </span>
            <span>Allocated: {task.allocatedMinutesToday} min</span>
          </div>

          {/* Assumptions */}
          {task.assumptions.length > 0 && (
            <div className="mt-1 rounded bg-blue-50 p-2">
              <p className="text-xs font-medium text-blue-700">Assumptions:</p>
              <ul className="mt-0.5 list-inside list-disc text-xs text-blue-600">
                {task.assumptions.map((assumption, index) => (
                  <li key={index}>{assumption}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
