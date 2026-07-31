"use client";

import { useState, FormEvent } from "react";

interface TaskFormProps {
  taskText: string;
  availableTime: number;
  isLoading: boolean;
  onTaskTextChange: (value: string) => void;
  onAvailableTimeChange: (value: number) => void;
  onSubmit: () => void;
}

export default function TaskForm({
  taskText,
  availableTime,
  isLoading,
  onTaskTextChange,
  onAvailableTimeChange,
  onSubmit,
}: TaskFormProps) {
  const [taskError, setTaskError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  const nonEmptyLines = taskText
    .split("\n")
    .filter((line) => line.trim().length > 0);

  const hasValidTasks = nonEmptyLines.length > 0;
  const isSubmitDisabled = !hasValidTasks || isLoading;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Validate tasks
    let hasError = false;

    if (nonEmptyLines.length === 0) {
      setTaskError("At least one task is required.");
      hasError = true;
    } else if (nonEmptyLines.length > 20) {
      setTaskError("Maximum of 20 tasks allowed.");
      hasError = true;
    } else if (taskText.length > 5000) {
      setTaskError("Total input must be 5000 characters or less.");
      hasError = true;
    } else {
      setTaskError(null);
    }

    // Validate available time
    if (availableTime < 0.5 || availableTime > 24) {
      setTimeError("Available time must be between 0.5 and 24 hours.");
      hasError = true;
    } else {
      setTimeError(null);
    }

    if (!hasError) {
      onSubmit();
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label
          htmlFor="task-input"
          className="block text-sm font-medium text-gray-700"
        >
          Your tasks
        </label>
        <textarea
          id="task-input"
          value={taskText}
          onChange={(e) => onTaskTextChange(e.target.value)}
          placeholder="Enter your tasks, one per line...&#10;e.g. Finish report - Friday - 2h&#10;Review PR - today - 30m&#10;Plan sprint meeting"
          rows={8}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {taskError && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {taskError}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="available-time"
          className="block text-sm font-medium text-gray-700"
        >
          Available time today (hours)
        </label>
        <input
          id="available-time"
          type="number"
          value={availableTime}
          onChange={(e) => onAvailableTimeChange(parseFloat(e.target.value) || 0)}
          min={0.5}
          max={24}
          step={0.5}
          className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {timeError && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {timeError}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
      >
        {isLoading ? "Prioritizing..." : "Prioritize My Tasks"}
      </button>
    </form>
  );
}
