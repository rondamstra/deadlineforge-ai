import { PrioritizeResponse } from "@/lib/schemas";
import Summary from "@/components/Summary";
import WarningsList from "@/components/WarningsList";
import TaskCard from "@/components/TaskCard";

interface ResultsDisplayProps {
  result: PrioritizeResponse;
}

export default function ResultsDisplay({ result }: ResultsDisplayProps) {
  return (
    <div className="space-y-6">
      <Summary summary={result.summary} />
      <WarningsList warnings={result.warnings} />
      <div className="space-y-4">
        {result.tasks.map((task) => (
          <TaskCard key={task.rank} task={task} />
        ))}
      </div>
    </div>
  );
}
