import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TaskForm from "./TaskForm";

const defaultProps = {
  taskText: "",
  availableTime: 4,
  isLoading: false,
  onTaskTextChange: vi.fn(),
  onAvailableTimeChange: vi.fn(),
  onSubmit: vi.fn(),
};

describe("TaskForm", () => {
  it("renders textarea with placeholder text", () => {
    render(<TaskForm {...defaultProps} />);
    const textarea = screen.getByLabelText("Your tasks");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute("placeholder");
  });

  it("renders numeric input for available time with correct attributes", () => {
    render(<TaskForm {...defaultProps} />);
    const input = screen.getByLabelText("Available time today (hours)");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveAttribute("min", "0.5");
    expect(input).toHaveAttribute("max", "24");
    expect(input).toHaveAttribute("step", "0.5");
  });

  it("renders submit button labeled 'Prioritize My Tasks'", () => {
    render(<TaskForm {...defaultProps} />);
    const button = screen.getByRole("button", { name: "Prioritize My Tasks" });
    expect(button).toBeInTheDocument();
  });

  it("disables submit button when taskText is empty", () => {
    render(<TaskForm {...defaultProps} taskText="" />);
    const button = screen.getByRole("button", { name: "Prioritize My Tasks" });
    expect(button).toBeDisabled();
  });

  it("disables submit button when isLoading is true", () => {
    render(<TaskForm {...defaultProps} taskText="Some task" isLoading={true} />);
    const button = screen.getByRole("button", { name: "Prioritizing..." });
    expect(button).toBeDisabled();
  });

  it("enables submit button when there are valid tasks and not loading", () => {
    render(<TaskForm {...defaultProps} taskText="Buy groceries" />);
    const button = screen.getByRole("button", { name: "Prioritize My Tasks" });
    expect(button).not.toBeDisabled();
  });

  it("calls onTaskTextChange when textarea value changes", () => {
    const onTaskTextChange = vi.fn();
    render(<TaskForm {...defaultProps} onTaskTextChange={onTaskTextChange} />);
    const textarea = screen.getByLabelText("Your tasks");
    fireEvent.change(textarea, { target: { value: "New task" } });
    expect(onTaskTextChange).toHaveBeenCalledWith("New task");
  });

  it("calls onAvailableTimeChange when time input changes", () => {
    const onAvailableTimeChange = vi.fn();
    render(
      <TaskForm {...defaultProps} onAvailableTimeChange={onAvailableTimeChange} />
    );
    const input = screen.getByLabelText("Available time today (hours)");
    fireEvent.change(input, { target: { value: "6" } });
    expect(onAvailableTimeChange).toHaveBeenCalledWith(6);
  });

  it("shows validation error when submitting more than 20 tasks", () => {
    const tasks = Array.from({ length: 21 }, (_, i) => `Task ${i + 1}`).join(
      "\n"
    );
    const onSubmit = vi.fn();
    render(<TaskForm {...defaultProps} taskText={tasks} onSubmit={onSubmit} />);
    const button = screen.getByRole("button", { name: "Prioritize My Tasks" });
    fireEvent.click(button);
    expect(screen.getByText("Maximum of 20 tasks allowed.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows validation error when total text exceeds 5000 characters", () => {
    const longText = "A".repeat(5001);
    const onSubmit = vi.fn();
    render(<TaskForm {...defaultProps} taskText={longText} onSubmit={onSubmit} />);
    const button = screen.getByRole("button", { name: "Prioritize My Tasks" });
    fireEvent.click(button);
    expect(
      screen.getByText("Total input must be 5000 characters or less.")
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows validation error when available time is out of range", () => {
    const onSubmit = vi.fn();
    render(
      <TaskForm
        {...defaultProps}
        taskText="Valid task"
        availableTime={0.1}
        onSubmit={onSubmit}
      />
    );
    const button = screen.getByRole("button", { name: "Prioritize My Tasks" });
    fireEvent.click(button);
    expect(
      screen.getByText("Available time must be between 0.5 and 24 hours.")
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit when all validation passes", () => {
    const onSubmit = vi.fn();
    render(
      <TaskForm {...defaultProps} taskText="Valid task" onSubmit={onSubmit} />
    );
    const button = screen.getByRole("button", { name: "Prioritize My Tasks" });
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("ignores whitespace-only lines when counting tasks", () => {
    const onSubmit = vi.fn();
    render(
      <TaskForm
        {...defaultProps}
        taskText={"  \n\nValid task\n   \n"}
        onSubmit={onSubmit}
      />
    );
    const button = screen.getByRole("button", { name: "Prioritize My Tasks" });
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("disables submit when only whitespace lines exist", () => {
    render(<TaskForm {...defaultProps} taskText={"  \n\n   \n"} />);
    const button = screen.getByRole("button", { name: "Prioritize My Tasks" });
    expect(button).toBeDisabled();
  });
});
