import { describe, it, expect } from "vitest";
import {
  PrioritizeRequestSchema,
  UrgencyLevel,
  PrioritizedTaskSchema,
  PrioritizeResponseSchema,
} from "./schemas";

describe("PrioritizeRequestSchema", () => {
  it("accepts valid request with tasks and availableTimeHours", () => {
    const result = PrioritizeRequestSchema.safeParse({
      tasks: ["Task 1", "Task 2"],
      availableTimeHours: 6,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasks).toEqual(["Task 1", "Task 2"]);
      expect(result.data.availableTimeHours).toBe(6);
    }
  });

  it("applies default of 4 for availableTimeHours when not provided", () => {
    const result = PrioritizeRequestSchema.safeParse({
      tasks: ["Task 1"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.availableTimeHours).toBe(4);
    }
  });

  it("rejects empty tasks array", () => {
    const result = PrioritizeRequestSchema.safeParse({
      tasks: [],
      availableTimeHours: 4,
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 tasks", () => {
    const result = PrioritizeRequestSchema.safeParse({
      tasks: Array(21).fill("task"),
      availableTimeHours: 4,
    });
    expect(result.success).toBe(false);
  });

  it("rejects tasks with empty strings", () => {
    const result = PrioritizeRequestSchema.safeParse({
      tasks: [""],
      availableTimeHours: 4,
    });
    expect(result.success).toBe(false);
  });

  it("rejects availableTimeHours below 0.5", () => {
    const result = PrioritizeRequestSchema.safeParse({
      tasks: ["task"],
      availableTimeHours: 0.4,
    });
    expect(result.success).toBe(false);
  });

  it("rejects availableTimeHours above 24", () => {
    const result = PrioritizeRequestSchema.safeParse({
      tasks: ["task"],
      availableTimeHours: 25,
    });
    expect(result.success).toBe(false);
  });

  it("accepts boundary values: 1 task, 0.5 hours", () => {
    const result = PrioritizeRequestSchema.safeParse({
      tasks: ["single task"],
      availableTimeHours: 0.5,
    });
    expect(result.success).toBe(true);
  });

  it("accepts boundary values: 20 tasks, 24 hours", () => {
    const result = PrioritizeRequestSchema.safeParse({
      tasks: Array(20).fill("task"),
      availableTimeHours: 24,
    });
    expect(result.success).toBe(true);
  });
});

describe("UrgencyLevel", () => {
  it("accepts valid urgency levels", () => {
    expect(UrgencyLevel.safeParse("Critical").success).toBe(true);
    expect(UrgencyLevel.safeParse("High").success).toBe(true);
    expect(UrgencyLevel.safeParse("Medium").success).toBe(true);
    expect(UrgencyLevel.safeParse("Low").success).toBe(true);
  });

  it("rejects invalid urgency levels", () => {
    expect(UrgencyLevel.safeParse("Urgent").success).toBe(false);
    expect(UrgencyLevel.safeParse("critical").success).toBe(false);
    expect(UrgencyLevel.safeParse("").success).toBe(false);
  });
});

describe("PrioritizedTaskSchema", () => {
  const validTask = {
    rank: 1,
    taskDescription: "Finish article",
    urgency: "Critical" as const,
    reason: "Deadline tomorrow",
    estimatedDurationMinutes: 120,
    allocatedMinutesToday: 120,
    assumptions: [],
  };

  it("accepts a valid task with numeric duration", () => {
    const result = PrioritizedTaskSchema.safeParse(validTask);
    expect(result.success).toBe(true);
  });

  it("accepts a valid task with null estimatedDurationMinutes", () => {
    const result = PrioritizedTaskSchema.safeParse({
      ...validTask,
      estimatedDurationMinutes: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts allocatedMinutesToday of 0", () => {
    const result = PrioritizedTaskSchema.safeParse({
      ...validTask,
      allocatedMinutesToday: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects rank less than 1", () => {
    const result = PrioritizedTaskSchema.safeParse({
      ...validTask,
      rank: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer rank", () => {
    const result = PrioritizedTaskSchema.safeParse({
      ...validTask,
      rank: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative allocatedMinutesToday", () => {
    const result = PrioritizedTaskSchema.safeParse({
      ...validTask,
      allocatedMinutesToday: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("PrioritizeResponseSchema", () => {
  const validResponse = {
    summary: "Focus on urgent tasks first",
    tasks: [
      {
        rank: 1,
        taskDescription: "Deploy app",
        urgency: "Critical" as const,
        reason: "Due today",
        estimatedDurationMinutes: 30,
        allocatedMinutesToday: 30,
        assumptions: [],
      },
    ],
    warnings: ["Tight schedule"],
  };

  it("accepts a valid response", () => {
    const result = PrioritizeResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it("accepts response with empty warnings array", () => {
    const result = PrioritizeResponseSchema.safeParse({
      ...validResponse,
      warnings: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects response with empty tasks array", () => {
    const result = PrioritizeResponseSchema.safeParse({
      ...validResponse,
      tasks: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects response with more than 20 tasks", () => {
    const task = validResponse.tasks[0];
    const result = PrioritizeResponseSchema.safeParse({
      ...validResponse,
      tasks: Array(21).fill(task),
    });
    expect(result.success).toBe(false);
  });

  it("rejects response missing summary", () => {
    const { summary, ...noSummary } = validResponse;
    const result = PrioritizeResponseSchema.safeParse(noSummary);
    expect(result.success).toBe(false);
  });
});
