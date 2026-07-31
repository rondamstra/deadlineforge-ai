import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TaskCard from "./TaskCard";

const baseTask = {
  rank: 1,
  taskDescription: "Finish report",
  urgency: "High" as const,
  reason: "Due tomorrow morning",
  estimatedDurationMinutes: 60,
  allocatedMinutesToday: 45,
  assumptions: [],
};

describe("TaskCard", () => {
  it("renders rank, description, urgency, reason, duration, and allocation", () => {
    render(<TaskCard task={baseTask} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Finish report")).toBeInTheDocument();
    expect(screen.getByText("Due tomorrow morning")).toBeInTheDocument();
    expect(screen.getByText("Estimated: 60 min")).toBeInTheDocument();
    expect(screen.getByText("Allocated: 45 min")).toBeInTheDocument();
  });

  it("shows 'Not provided' when estimatedDurationMinutes is null", () => {
    render(
      <TaskCard task={{ ...baseTask, estimatedDurationMinutes: null }} />
    );

    expect(screen.getByText("Estimated: Not provided")).toBeInTheDocument();
  });

  it("shows Deferred badge when allocatedMinutesToday is 0", () => {
    render(
      <TaskCard task={{ ...baseTask, allocatedMinutesToday: 0 }} />
    );

    expect(screen.getByText("Deferred")).toBeInTheDocument();
  });

  it("does not show Deferred badge when allocatedMinutesToday > 0", () => {
    render(<TaskCard task={baseTask} />);

    expect(screen.queryByText("Deferred")).not.toBeInTheDocument();
  });

  it("displays assumptions when present", () => {
    const task = {
      ...baseTask,
      assumptions: ["No deadline specified", "Estimated based on priority"],
    };
    render(<TaskCard task={task} />);

    expect(screen.getByText("Assumptions:")).toBeInTheDocument();
    expect(screen.getByText("No deadline specified")).toBeInTheDocument();
    expect(screen.getByText("Estimated based on priority")).toBeInTheDocument();
  });

  it("does not render assumptions section when array is empty", () => {
    render(<TaskCard task={baseTask} />);

    expect(screen.queryByText("Assumptions:")).not.toBeInTheDocument();
  });

  it("applies correct urgency colors for Critical", () => {
    render(<TaskCard task={{ ...baseTask, urgency: "Critical" }} />);

    const badge = screen.getByText("Critical");
    expect(badge.className).toContain("bg-red-100");
    expect(badge.className).toContain("text-red-800");
  });

  it("applies correct urgency colors for High", () => {
    render(<TaskCard task={baseTask} />);

    const badge = screen.getByText("High");
    expect(badge.className).toContain("bg-orange-100");
    expect(badge.className).toContain("text-orange-800");
  });

  it("applies correct urgency colors for Medium", () => {
    render(<TaskCard task={{ ...baseTask, urgency: "Medium" }} />);

    const badge = screen.getByText("Medium");
    expect(badge.className).toContain("bg-yellow-100");
    expect(badge.className).toContain("text-yellow-800");
  });

  it("applies correct urgency colors for Low", () => {
    render(<TaskCard task={{ ...baseTask, urgency: "Low" }} />);

    const badge = screen.getByText("Low");
    expect(badge.className).toContain("bg-green-100");
    expect(badge.className).toContain("text-green-800");
  });

  it("visually indicates deferred tasks with reduced opacity", () => {
    const { container } = render(
      <TaskCard task={{ ...baseTask, allocatedMinutesToday: 0 }} />
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("opacity-75");
    expect(card.className).toContain("bg-gray-50");
  });
});
