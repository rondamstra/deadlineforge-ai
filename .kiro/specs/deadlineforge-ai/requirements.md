# Requirements Document

## Introduction

DeadlineForge AI is a lightweight weekend-challenge MVP web application that solves the problem of deciding what to work on first when multiple deadlines compete. Users paste or type a list of tasks (with optional deadlines and estimated durations), optionally specify how much time they have today, and the app uses Amazon Bedrock (Nova Lite) via the Converse API to prioritize tasks, estimate urgency, explain reasoning, and generate an ordered plan with allocated minutes per task. The app is a single-page stateless application with no authentication or persistence, deployed via AWS Amplify Hosting using a Next.js server-side API route on the standard Node.js runtime.

## Glossary

- **App**: The DeadlineForge AI single-page web application built with Next.js (App Router), TypeScript, and Tailwind CSS
- **Task_Input**: A user-provided text entry representing a single task, which may include a deadline and an estimated duration
- **Task_List**: A collection of one or more Task_Input entries submitted by the user for prioritization (maximum 20 tasks)
- **Available_Time**: An optional user-provided value representing how many hours the user has available today, defaulting to 4 hours
- **Prioritization_Engine**: The server-side component within the Next.js API route that calls Amazon Bedrock Nova Lite via the Converse API to analyze tasks and produce a prioritized plan
- **Prioritized_Plan**: The AI-generated output containing a summary, prioritized tasks with per-task priority rank, urgency level, reasoning, estimatedDurationMinutes (null if unknown), allocatedMinutesToday, assumptions, and a warnings array
- **API_Route**: The Next.js server-side API route (standard Node.js runtime) deployed via AWS Amplify Hosting that handles communication between the App and Amazon Bedrock
- **Converse_API**: The Amazon Bedrock Converse API accessed through @aws-sdk/client-bedrock-runtime for sending requests to the foundation model
- **Nova_Lite**: The Amazon Bedrock foundation model (amazon.nova-lite-v1:0) used for task analysis and prioritization
- **Response_Schema**: A Zod schema defining the strict JSON structure that Nova_Lite must return, validated before rendering results

## Requirements

### Requirement 1: Task Input

**User Story:** As a user, I want to paste or type a list of tasks with optional deadlines and estimated durations, so that I can get an AI-prioritized plan for my day.

#### Acceptance Criteria

1. THE App SHALL provide a text input area where users can enter between 1 and 20 tasks, with a maximum total input length of 5000 characters
2. WHEN a user enters a task, THE App SHALL accept an optional deadline in natural language date/time expressions (e.g., "tomorrow 3pm", "Friday", "2026-08-15 14:00") that the AI will interpret
3. WHEN a user enters a task, THE App SHALL accept an optional estimated duration expressed as a numeric value with a time unit (e.g., "30m", "1.5h", "2 hours"), representing a value between 1 minute and 24 hours
4. THE App SHALL treat each non-empty line in the text input as a separate task, ignoring lines that contain only whitespace
5. IF a user submits a Task_List where no line contains task text, THEN THE App SHALL display a validation message adjacent to the text input area indicating that at least one task is required
6. IF the user enters more than 20 tasks, THEN THE App SHALL display a validation message indicating the maximum number of tasks allowed is 20
7. THE App SHALL provide an optional "Available time today" numeric input field, defaulting to 4 hours, that accepts values between 0.5 and 24 hours
8. THE App SHALL pass natural-language deadline expressions directly to the API_Route without client-side date parsing or transformation

### Requirement 2: Task Prioritization Request

**User Story:** As a user, I want to submit my task list for AI prioritization, so that I can receive a recommended plan for today.

#### Acceptance Criteria

1. THE App SHALL provide a submit button labeled "Prioritize My Tasks" to send the Task_List and Available_Time to the Prioritization_Engine
2. WHEN the user submits a valid Task_List, THE App SHALL send the Task_List and Available_Time value to the API_Route for processing
3. WHILE the Prioritization_Engine is processing the Task_List, THE App SHALL display a visible loading indicator with a text message indicating that prioritization is in progress
4. WHEN the user submits the Task_List, THE App SHALL disable the submit button until a success response or error response is received
5. IF the Task_List is empty, THEN THE App SHALL keep the submit button disabled

### Requirement 3: AI Prioritization via Amazon Bedrock

**User Story:** As a user, I want the app to use AI to analyze my tasks and produce a prioritized plan, so that I know what to work on first.

#### Acceptance Criteria

1. WHEN the API_Route receives a valid Task_List, THE Prioritization_Engine SHALL send the tasks to Nova_Lite via the Converse_API using @aws-sdk/client-bedrock-runtime, including any provided deadlines and estimated durations for each task, as well as the Available_Time value
2. WHEN the Converse_API supports native structured JSON output configuration for the selected model, THE Prioritization_Engine SHALL configure the request to prefer structured JSON output; IF native structured output is unavailable, THE Prioritization_Engine SHALL fall back to the prompt instruction requiring the model to return only valid JSON
3. THE API_Route SHALL include the current ISO date, current time, and the Europe/Amsterdam timezone in the prompt sent to Nova_Lite so that relative date expressions such as "tomorrow" and "Friday" can be interpreted correctly by the model
4. THE Prioritization_Engine SHALL pass natural-language deadline expressions directly to Nova_Lite without any separate date-parsing logic on the server
5. IF a Task_Input lacks a deadline, THEN THE Prioritization_Engine SHALL instruct Nova_Lite to list any assumptions made about that task; IF a Task_Input lacks an estimated duration, THEN THE Prioritization_Engine SHALL instruct Nova_Lite to set estimatedDurationMinutes to null for that task and SHALL NOT estimate or fabricate a duration value; assumptions about allocation rationale MAY still be listed
6. THE Prioritization_Engine SHALL instruct Nova_Lite to return a strict JSON response containing: a summary string providing a brief overview of the plan, for each task a priority rank, an urgency level from the set (Critical, High, Medium, Low), a reason for its position, estimatedDurationMinutes (ONLY the user-provided duration in minutes, or null if the user did not provide one; never AI-estimated), allocatedMinutesToday (the minutes allocated to this task in today's plan), assumptions, and a top-level warnings array highlighting risks
7. THE Prioritization_Engine SHALL instruct Nova_Lite to generate an ordered plan where allocatedMinutesToday values fit within the user's Available_Time; tasks that do NOT fit within the Available_Time SHALL remain in the prioritized list with allocatedMinutesToday set to 0 and an explanation in the reason field that they are deferred to another day
8. IF the API_Route receives a Task_List containing more than 20 tasks, THEN THE Prioritization_Engine SHALL reject the request and return an error indicating the maximum of 20 tasks has been exceeded
9. WHEN the API_Route receives a response from Nova_Lite, THE Prioritization_Engine SHALL validate the response against the Response_Schema (Zod) before returning it to the App
10. IF the Nova_Lite response does not conform to the Response_Schema, THEN THE Prioritization_Engine SHALL return an error indicating the AI returned an unexpected format
11. THE Prioritization_Engine SHALL NOT invent, estimate, or fabricate task durations; IF the user did not provide a duration, estimatedDurationMinutes SHALL be null; allocatedMinutesToday MAY still be non-zero with an assumption explaining the allocation is based on priority rather than a known duration; THE Prioritization_Engine SHALL NOT invent or fabricate deadlines
12. THE Prioritization_Engine SHALL ensure that the sum of allocatedMinutesToday across all tasks does NOT exceed Available_Time converted to minutes

### Requirement 4: Prioritized Plan Display

**User Story:** As a user, I want to see the AI-generated prioritized plan clearly displayed, so that I can follow the recommended order.

#### Acceptance Criteria

1. WHEN the API_Route returns a valid Prioritized_Plan, THE App SHALL display the summary at the top of the results area
2. WHEN the API_Route returns a valid Prioritized_Plan, THE App SHALL display each task as a card or row showing: priority rank, urgency level, reason for its position, estimatedDurationMinutes (or "Not provided" if null), allocatedMinutesToday, and any assumptions made
3. WHEN the API_Route returns a valid Prioritized_Plan, THE App SHALL display tasks in order of recommended priority, below the input area on the same page
4. WHEN the API_Route returns a valid Prioritized_Plan, THE App SHALL visually distinguish urgency levels (Critical, High, Medium, Low) using color or styling so they are differentiable without reading the label text
5. WHEN a task has assumptions made by the AI, THE App SHALL display those assumptions visibly within the task card or row
6. WHEN a task has estimatedDurationMinutes set to null, THE App SHALL display the estimated duration as "Not provided" rather than showing a fabricated value
7. WHEN a task has allocatedMinutesToday set to 0, THE App SHALL visually indicate that the task is deferred to another day
8. WHEN the API_Route returns a valid Prioritized_Plan with warnings, THE App SHALL display the warnings prominently above the task list

### Requirement 5: Error Handling

**User Story:** As a user, I want to see helpful error messages when something goes wrong, so that I understand what happened and can try again.

#### Acceptance Criteria

1. IF the API_Route fails to communicate with Nova_Lite, THEN THE App SHALL display a user-friendly error message indicating the service is temporarily unavailable and re-enable the submit button
2. IF the API_Route returns an error response, THEN THE App SHALL display a user-friendly error message that does not expose raw error codes or stack traces
3. WHEN an error is displayed, THE App SHALL provide a visible retry button that resubmits the most recent Task_List without requiring the user to re-enter it
4. IF an error occurs during processing, THEN THE App SHALL preserve the user's Task_List input and Available_Time value so they remain available for retry or editing
5. WHEN an error is displayed, THE App SHALL dismiss the loading indicator and display the error message within the results area of the page

### Requirement 6: Single-Page User Interface

**User Story:** As a user, I want a clean and minimal interface on a single page, so that I can quickly input tasks and see results without navigating between pages.

#### Acceptance Criteria

1. THE App SHALL render all functionality (task input, available time input, submission, and results display) on a single page without client-side routing or navigation between views
2. THE App SHALL use a visual design styled with Tailwind CSS that contains no more than two accent colors, uses consistent spacing, and avoids decorative elements unrelated to functionality
3. THE App SHALL be fully usable without horizontal scrolling on viewports from 320px wide (mobile) to 1440px wide (desktop), with all interactive elements at minimum 44x44px touch target size on mobile
4. THE App SHALL display the application name "DeadlineForge AI" in the page header, visible without scrolling on initial page load
5. THE App SHALL arrange UI sections in a single-column top-to-bottom layout in the order: header, "Use Example Tasks" and "Reset" buttons, task input area, available time input, submit button, results display area (empty state or results)

### Requirement 7: Stateless Operation

**User Story:** As a user, I understand that my task data is not saved between sessions, so that the app remains simple and privacy-respecting.

#### Acceptance Criteria

1. THE App SHALL NOT persist Task_List data, Available_Time, or Prioritized_Plan data to localStorage, sessionStorage, cookies, or any server-side storage mechanism
2. WHEN the user refreshes the page, THE App SHALL display the initial empty state with no Task_List entries and no Prioritized_Plan displayed, with Available_Time reset to the default of 4 hours
3. THE App SHALL NOT require user authentication or account creation
4. THE API_Route SHALL NOT log or store user Task_List data or Prioritized_Plan data beyond the lifetime of a single request-response cycle
5. THE App SHALL store all user data exclusively in React component state, which is cleared on page unload or refresh

### Requirement 8: Example Tasks

**User Story:** As a user, I want to quickly try the app with realistic demo data, so that I can understand how it works before entering my own tasks.

#### Acceptance Criteria

1. THE App SHALL provide a "Use Example Tasks" button positioned above the task input textarea
2. WHEN the user clicks the "Use Example Tasks" button, THE App SHALL fill the textarea with the following example data:
   ```
   Finish AWS Builder article - tomorrow - 2h
   Deploy application to Amplify - today - 30m
   Write project README
   Prepare presentation for Monday - 1h
   ```
3. WHEN the "Use Example Tasks" button is clicked, THE App SHALL NOT automatically submit the form
4. AFTER the example tasks are loaded, THE App SHALL allow the user to edit the text before submitting
5. IF the textarea already contains text, THEN clicking "Use Example Tasks" SHALL replace the existing text with the example data

### Requirement 9: Empty State

**User Story:** As a user, I want to see a helpful placeholder in the results area before I run any analysis, so that I know how to use the app.

#### Acceptance Criteria

1. BEFORE any prioritization has been performed, THE App SHALL display a friendly placeholder in the results area explaining: paste your tasks, optionally set available time, and click "Prioritize My Tasks"
2. AFTER a successful prioritization, THE App SHALL replace the empty state placeholder with the actual results
3. IF the user has not yet submitted any tasks, THE App SHALL show the empty state placeholder (not a blank area)

### Requirement 10: Reset

**User Story:** As a user, I want to quickly reset the app to its initial state, so that I can start fresh without refreshing the page.

#### Acceptance Criteria

1. THE App SHALL provide a "Reset" button positioned next to the "Use Example Tasks" button
2. WHEN the user clicks the "Reset" button, THE App SHALL clear the task textarea to empty
3. WHEN the user clicks the "Reset" button, THE App SHALL reset the Available Time input to the default value of 4 hours
4. WHEN the user clicks the "Reset" button, THE App SHALL clear any previous Prioritized_Plan results
5. WHEN the user clicks the "Reset" button, THE App SHALL clear any error messages
6. WHEN the user clicks the "Reset" button, THE App SHALL return the results area to the Empty State
7. THE "Reset" button SHALL NOT refresh or reload the page
8. THE "Reset" button SHALL NOT affect any server-side state

## API Schemas

### Request Schema

```typescript
import { z } from "zod";

export const PrioritizeRequestSchema = z.object({
  tasks: z.array(z.string().min(1)).min(1).max(20),
  availableTimeHours: z.number().min(0.5).max(24).default(4),
});

export type PrioritizeRequest = z.infer<typeof PrioritizeRequestSchema>;
```

### Response Schema

```typescript
import { z } from "zod";

export const UrgencyLevel = z.enum(["Critical", "High", "Medium", "Low"]);

export const PrioritizedTaskSchema = z.object({
  rank: z.number().int().min(1),
  taskDescription: z.string(),
  urgency: UrgencyLevel,
  reason: z.string(),
  estimatedDurationMinutes: z.number().int().min(1).nullable(),
  allocatedMinutesToday: z.number().int().min(0),
  assumptions: z.array(z.string()),
});

export const PrioritizeResponseSchema = z.object({
  summary: z.string(),
  tasks: z.array(PrioritizedTaskSchema).min(1).max(20),
  warnings: z.array(z.string()),
});

export type PrioritizeResponse = z.infer<typeof PrioritizeResponseSchema>;
```
