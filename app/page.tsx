"use client";

import { useState } from "react";
import { PrioritizeResponse } from "@/lib/schemas";
import { EXAMPLE_TASKS } from "@/lib/constants";
import Header from "@/components/Header";
import ExampleTasksButton from "@/components/ExampleTasksButton";
import ResetButton from "@/components/ResetButton";
import TaskForm from "@/components/TaskForm";
import LoadingIndicator from "@/components/LoadingIndicator";
import ErrorDisplay from "@/components/ErrorDisplay";
import EmptyState from "@/components/EmptyState";
import ResultsDisplay from "@/components/ResultsDisplay";

export default function Home() {
  const [taskText, setTaskText] = useState("");
  const [availableTime, setAvailableTime] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PrioritizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const tasks = taskText.split("\n").filter((line) => line.trim().length > 0);

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, availableTimeHours: availableTime }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "An unexpected error occurred. Please try again."
        );
      } else {
        setResult(data);
      }
    } catch {
      setError(
        "The prioritization service is temporarily unavailable. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadExample = () => {
    setTaskText(EXAMPLE_TASKS);
  };

  const handleReset = () => {
    setTaskText("");
    setAvailableTime(4);
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  const handleRetry = () => {
    handleSubmit();
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Header />
      <div className="mt-4 flex gap-2">
        <ExampleTasksButton onLoadExample={handleLoadExample} />
        <ResetButton onReset={handleReset} />
      </div>
      <div className="mt-6">
        <TaskForm
          taskText={taskText}
          availableTime={availableTime}
          isLoading={isLoading}
          onTaskTextChange={setTaskText}
          onAvailableTimeChange={setAvailableTime}
          onSubmit={handleSubmit}
        />
      </div>
      <div className="mt-8">
        {isLoading && <LoadingIndicator />}
        {error && !isLoading && (
          <ErrorDisplay message={error} onRetry={handleRetry} />
        )}
        {result && !isLoading && !error && <ResultsDisplay result={result} />}
        {!result && !error && !isLoading && <EmptyState />}
      </div>
    </main>
  );
}
