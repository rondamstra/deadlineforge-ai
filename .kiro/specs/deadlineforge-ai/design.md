# Design Document: DeadlineForge AI

## Overview

DeadlineForge AI is a single-page Next.js application that accepts a list of tasks (with optional deadlines and durations), sends them to Amazon Bedrock Nova Lite via the Converse API, and displays an AI-prioritized plan with allocated time per task. The app is stateless, requires no authentication, and deploys on AWS Amplify Hosting using the standard Node.js runtime for the API route.

The architecture is intentionally minimal for a weekend MVP: one page, one API route, shared Zod schemas, and a single external dependency (Bedrock). No database, no auth, no client-side routing.

## Architecture

```mermaid
graph TD
    A[Browser - React SPA] -->|POST /api/prioritize| B[Next.js API Route]
    B -->|Converse API| C[Amazon Bedrock Nova Lite]
    C -->|JSON response| B
    B -->|Zod-validated JSON| A

    subgraph AWS Amplify Hosting
        B
    end

    subgraph Amazon Bedrock
        C
    end
```

**Data flow:**
1. User enters tasks + available time in the React UI
2. Client parses text into task lines, validates locally, sends POST to `/api/prioritize`
3. API route validates request with Zod, constructs prompt, calls Bedrock Converse API
4. Bedrock returns JSON, API route validates with Zod response schema
5. Validated response sent back to client for rendering

**Runtime:** Standard Node.js (not Edge) — required for AWS SDK compatibility and Amplify compute.

## Components and Interfaces

### React Component Tree

```
app/page.tsx (Page)
├── components/Header.tsx
├── components/ExampleTasksButton.tsx
├── components/ResetButton.tsx
├── components/TaskForm.tsx
│   ├── <textarea> for task input
│   ├── <input type="number"> for available time
│   └── <button> submit ("Prioritize My Tasks")
├── components/LoadingIndicator.tsx
├── components/ErrorDisplay.tsx
│   └── <button> retry
├── components/EmptyState.tsx
└── components/ResultsDisplay.tsx
    ├── components/Summary.tsx
    ├── components/WarningsList.tsx
    └── components/TaskCard.tsx (repeated per task)
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `Page` | Top-level layout, owns all state (task text, available time, loading, result, error) |
| `Header` | Renders app name "DeadlineForge AI" |
| `ExampleTasksButton` | "Use Example Tasks" button that fills the textarea with demo data. Calls parent's `onLoadExample` handler |
| `ResetButton` | "Reset" button that clears all state back to initial values. Calls parent's `onReset` handler |
| `TaskForm` | Text input, time input, submit button. Calls parent's `onSubmit` handler |
| `LoadingIndicator` | Shown while API call in flight |
| `ErrorDisplay` | Shows user-friendly error message + retry button |
| `EmptyState` | Friendly placeholder shown before any prioritization, explains how to use the app |
| `ResultsDisplay` | Container for summary, warnings, and task cards |
| `Summary` | Renders the `summary` string from the response |
| `WarningsList` | Renders warnings array above task cards |
| `TaskCard` | Single prioritized task: rank, urgency badge, reason, duration, allocation, assumptions |

### State Management

All state lives in `Page` component via `useState`:

```typescript
const [taskText, setTaskText] = useState("");
const [availableTime, setAvailableTime] = useState(4);
const [isLoading, setIsLoading] = useState(false);
const [result, setResult] = useState<PrioritizeResponse | null>(null);
const [error, setError] = useState<string | null>(null);
```

No external state management library. State is cleared on page refresh (stateless requirement).

**Reset handler:**

```typescript
const handleReset = () => {
  setTaskText("");
  setAvailableTime(4);
  setResult(null);
  setError(null);
  setIsLoading(false);
};
```

The reset handler clears all state to initial values, returning the UI to the Empty State. It does not refresh the page or affect server-side state.

**Conditional rendering logic:**
- `EmptyState` is shown when `result === null && error === null && !isLoading`
- `LoadingIndicator` is shown when `isLoading === true`
- `ErrorDisplay` is shown when `error !== null`
- `ResultsDisplay` is shown when `result !== null`

### Client-Side Validation

Before submitting, the client:
1. Splits `taskText` by newlines
2. Filters lines that are empty or whitespace-only
3. Checks: at least 1 task, at most 20 tasks, total length ≤ 5000 characters
4. Validates available time: 0.5 ≤ value ≤ 24

Validation errors are displayed inline adjacent to the relevant input.

## Data Models

### Shared Zod Schemas (`lib/schemas.ts`)

```typescript
import { z } from "zod";

// Request
export const PrioritizeRequestSchema = z.object({
  tasks: z.array(z.string().min(1)).min(1).max(20),
  availableTimeHours: z.number().min(0.5).max(24).default(4),
});
export type PrioritizeRequest = z.infer<typeof PrioritizeRequestSchema>;

// Response
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

These schemas are imported by both the API route (server) and the client (for type inference). Zod runs validation server-side on both the incoming request and the Bedrock response.

### API Contract

**Endpoint:** `POST /api/prioritize`

**Request Body:**
```json
{
  "tasks": [
    "Finish AWS Builder article - tomorrow - 2h",
    "Deploy application to Amplify - today - 30m",
    "Write project README",
    "Prepare presentation for Monday - 1h"
  ],
  "availableTimeHours": 4
}
```

**Success Response (200):**
```json
{
  "summary": "Focus on the AWS Builder article first since it's due tomorrow...",
  "tasks": [
    {
      "rank": 1,
      "taskDescription": "Finish AWS Builder article - tomorrow - 2h",
      "urgency": "Critical",
      "reason": "Deadline is tomorrow, must be completed today",
      "estimatedDurationMinutes": 120,
      "allocatedMinutesToday": 120,
      "assumptions": []
    },
    {
      "rank": 2,
      "taskDescription": "Write project README",
      "urgency": "Medium",
      "reason": "No deadline specified, but important for project completeness",
      "estimatedDurationMinutes": null,
      "allocatedMinutesToday": 60,
      "assumptions": ["Task duration was not provided by the user. Allocated 60 minutes based on priority."]
    }
  ],
  "warnings": ["2 tasks have no deadline specified — prioritized based on general importance"]
}
```

**Error Response (4xx/5xx):**
```json
{
  "error": "User-friendly error message"
}
```

## Bedrock Converse API Interaction

### SDK Client Setup

```typescript
// app/api/prioritize/route.ts
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});
```

The client is instantiated at module scope (reused across invocations in the same compute instance). AWS credentials are provided automatically by Amplify's compute environment — no explicit credential configuration needed.

### Converse API Call

```typescript
const modelId = process.env.BEDROCK_MODEL_ID || "amazon.nova-lite-v1:0";

const command = new ConverseCommand({
  modelId,
  messages: [
    {
      role: "user",
      content: [{ text: userMessage }],
    },
  ],
  system: [{ text: systemPrompt }],
  inferenceConfig: {
    maxTokens: 4096,
    temperature: 0.3,
  },
  // Prefer structured JSON output when supported by the model
  additionalModelRequestFields: {
    inferenceConfig: {
      topK: 1,
    },
  },
});

const response = await client.send(command);
const assistantText = response.output?.message?.content?.[0]?.text;
```

**Design decisions:**
- `temperature: 0.3` — low creativity, consistent structured output
- `maxTokens: 4096` — sufficient for 20-task JSON response
- System prompt is separate from user message per Converse API best practice

### Structured JSON Output

When supported by the selected Amazon Bedrock model and Converse API, the implementation should configure the request to prefer structured JSON output using the API's native response format capabilities. Specifically:

1. If the Converse API supports an `additionalModelRequestFields` or response format configuration for the selected model, include it to signal that the response should be JSON.
2. If the model or API version does not support native structured output, fall back to the existing prompt instruction ("Respond with ONLY the JSON object...").
3. Regardless of which method produces the output, the Zod response schema validation is always applied.

This is a transparent optimization — it does not change the API contract, response schema, or user experience.

Note: The exact field name for JSON mode may vary by model. Check the Bedrock documentation for Nova Lite's support of structured output. The prompt-based fallback ensures correctness regardless.

## Prompt Design

### System Prompt

```
You are a task prioritization assistant. Your job is to analyze a list of tasks and produce a prioritized plan.

Current date and time: ${new Date().toISOString()}
Timezone: Europe/Amsterdam

You MUST respond with ONLY valid JSON matching this exact structure:
{
  "summary": "Brief overview of the prioritized plan",
  "tasks": [
    {
      "rank": 1,
      "taskDescription": "The task as provided by the user",
      "urgency": "Critical" | "High" | "Medium" | "Low",
      "reason": "Why this task has this priority and urgency",
      "estimatedDurationMinutes": <integer or null>,
      "allocatedMinutesToday": <integer, 0 if deferred>,
      "assumptions": ["Any assumptions made about this task"]
    }
  ],
  "warnings": ["Any risks or concerns about the plan"]
}

Rules:
- Rank tasks by urgency considering deadlines relative to the current date/time.
- estimatedDurationMinutes: Use ONLY the user-provided duration if given (e.g., "2h" → 120, "30m" → 30). If the user did NOT provide a duration, this MUST be null. You MUST NEVER estimate, guess, or fabricate a duration value.
- allocatedMinutesToday: Allocate minutes from the user's available time to tasks in priority order. The SUM of all allocatedMinutesToday values MUST NOT exceed the user's available time in minutes. allocatedMinutesToday MAY be non-zero even when estimatedDurationMinutes is null — in that case, explain in assumptions that the allocation is based on priority, not a known duration.
- Tasks that do not fit within the available time: Keep them in the prioritized list with allocatedMinutesToday set to 0, and explain in the reason field that they are deferred to another day.
- If a task lacks a deadline, you may note this in assumptions.
- If a task lacks a duration, set estimatedDurationMinutes to null. Do NOT guess or estimate the total duration. You MAY still allocate time in allocatedMinutesToday based on priority, and explain in assumptions that the allocation is priority-based rather than duration-based.
- Include a summary explaining the overall plan strategy.
- Include warnings for any risks (e.g., tight deadlines, overcommitment, missing information).
- Respond with ONLY the JSON object. No markdown, no explanation, no code fences.
```

### User Message

```
I have ${availableTimeHours} hours available today. Please prioritize these tasks:

${tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}
```

## Error Handling

### Error Flow

```mermaid
graph LR
    A[Client POST] --> B{API Route}
    B -->|Zod request validation fails| C[400: Invalid request]
    B -->|Bedrock call fails| D[502: Service unavailable]
    B -->|Zod response validation fails| E[502: AI returned unexpected format]
    B -->|Success| F[200: Validated response]
    C --> G[Client: ErrorDisplay]
    D --> G
    E --> G
```

### Error Types and Responses

| Error Source | HTTP Status | Response Message |
|---|---|---|
| Request body fails Zod validation | 400 | Specific validation error (e.g., "At least 1 task required", "Maximum 20 tasks allowed") |
| Task count exceeds 20 | 400 | "Maximum of 20 tasks allowed" |
| Bedrock SDK throws (network/service error) | 502 | "The prioritization service is temporarily unavailable. Please try again." |
| Bedrock response fails Zod validation | 502 | "The AI returned an unexpected response format. Please try again." |
| Unknown/unexpected error | 500 | "An unexpected error occurred. Please try again." |

### API Route Error Handling Pattern

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = PrioritizeRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    // ... Bedrock call ...

    const validated = PrioritizeResponseSchema.safeParse(JSON.parse(assistantText));
    if (!validated.success) {
      return Response.json(
        { error: "The AI returned an unexpected response format. Please try again." },
        { status: 502 }
      );
    }

    return Response.json(validated.data);
  } catch (err) {
    // Bedrock SDK errors or network failures
    return Response.json(
      { error: "The prioritization service is temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}
```

### Client Error Handling

The client displays the `error` field from the response in the `ErrorDisplay` component. The retry button re-submits the last request without user re-entry. The loading indicator is dismissed on any error.

## Deployment and Infrastructure

### AWS Amplify Hosting Configuration

The app deploys as a standard Next.js app on Amplify Hosting. The API route runs on the standard Node.js runtime (NOT Edge).

**`amplify.yml` build spec:**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### IAM Permissions

The Amplify compute role needs permission to invoke the Bedrock model:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0"
    }
  ]
}
```

This is the minimum permission needed. The `bedrock:InvokeModel` action on the specific Nova Lite model ARN.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_REGION` | No | `us-east-1` | AWS region for Bedrock client |
| `BEDROCK_MODEL_ID` | No | `amazon.nova-lite-v1:0` | Bedrock model identifier |

AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`) are provided automatically by Amplify's compute environment. No manual credential configuration needed.

### Runtime Configuration

The API route must use the standard Node.js runtime:

```typescript
// app/api/prioritize/route.ts
export const runtime = "nodejs"; // NOT "edge"
```

## File/Folder Structure

```
deadlineforge-ai/
├── app/
│   ├── api/
│   │   └── prioritize/
│   │       └── route.ts          # API route handler (Bedrock + Zod validation)
│   ├── favicon.ico
│   ├── globals.css               # Tailwind imports + custom styles
│   ├── layout.tsx                # Root layout (metadata, fonts)
│   └── page.tsx                  # Main page (state management, orchestration)
├── components/
│   ├── Header.tsx                # App name display
│   ├── ExampleTasksButton.tsx    # "Use Example Tasks" button
│   ├── ResetButton.tsx           # "Reset" button
│   ├── TaskForm.tsx              # Text input + time input + submit button
│   ├── LoadingIndicator.tsx      # Loading state display
│   ├── ErrorDisplay.tsx          # Error message + retry button
│   ├── EmptyState.tsx            # Placeholder shown before any prioritization
│   ├── ResultsDisplay.tsx        # Container for results
│   ├── Summary.tsx               # Plan summary text
│   ├── WarningsList.tsx          # Warnings array display
│   └── TaskCard.tsx              # Individual task card
├── lib/
│   ├── schemas.ts                # Shared Zod schemas (request + response)
│   └── constants.ts              # Example tasks data and app constants
├── public/                       # Static assets
├── amplify.yml                   # Amplify build spec
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts            # (if needed for custom config)
└── postcss.config.mjs
```

### Example Tasks Constant

```typescript
// lib/constants.ts
export const EXAMPLE_TASKS = `Finish AWS Builder article - tomorrow - 2h
Deploy application to Amplify - today - 30m
Write project README
Prepare presentation for Monday - 1h`;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Task line parsing preserves all non-whitespace content

*For any* multi-line string input, parsing it into a task array by splitting on newlines and filtering whitespace-only lines SHALL produce an array where every element is a non-empty, non-whitespace string, and every non-whitespace line from the original input appears in the output.

**Validates: Requirements 1.4**

### Property 2: Request schema accepts valid inputs and rejects invalid ones

*For any* object with a `tasks` array of 1–20 non-empty strings and an `availableTimeHours` between 0.5 and 24, the PrioritizeRequestSchema SHALL accept the input. *For any* object that violates these constraints (empty tasks array, >20 tasks, tasks with empty strings, availableTimeHours outside bounds), the schema SHALL reject it.

**Validates: Requirements 1.1, 1.7, 3.7**

### Property 3: Allocation time invariant

*For any* valid PrioritizeResponse where the associated request has `availableTimeHours = H`, the sum of `allocatedMinutesToday` across all tasks in the response SHALL NOT exceed `H * 60`.

**Validates: Requirements 3.6, 3.11**

### Property 4: Response schema validates well-formed responses and permits null durations

*For any* JSON object that conforms to the PrioritizeResponseSchema structure (summary string, 1-20 tasks each with valid rank/urgency/reason/allocatedMinutesToday/assumptions, warnings array), the schema SHALL accept it — including when `estimatedDurationMinutes` is null. *For any* JSON object missing required fields or with invalid types, the schema SHALL reject it.

**Validates: Requirements 3.4, 3.8, 3.9, 3.10**

## Testing Strategy

### Approach

This project uses a dual testing approach:

1. **Property-based tests** — Verify universal invariants across generated inputs using `fast-check`
2. **Unit tests** — Verify specific examples, edge cases, and UI behavior using `vitest` + `@testing-library/react`

### Property-Based Tests (fast-check)

Library: `fast-check` (TypeScript property-based testing library)
Configuration: Minimum 100 iterations per property test

Each property test references its design document property:

```typescript
// Feature: deadlineforge-ai, Property 1: Task line parsing preserves all non-whitespace content
// Feature: deadlineforge-ai, Property 2: Request schema accepts valid inputs and rejects invalid ones
// Feature: deadlineforge-ai, Property 3: Allocation time invariant
// Feature: deadlineforge-ai, Property 4: Response schema validates well-formed responses
```

### Unit Tests

Focus areas:
- Component rendering: Header shows app name, TaskForm shows inputs, TaskCard renders all fields, ExampleTasksButton renders correctly, ResetButton renders correctly, EmptyState shows instructions
- State transitions: loading → result, loading → error, error → retry, empty state → results
- ExampleTasksButton: clicking fills textarea with EXAMPLE_TASKS constant, does not auto-submit
- ResetButton: clicking calls onReset handler
- Reset behavior: clears taskText, resets availableTime to 4, sets result to null, sets error to null
- After reset: EmptyState is shown (result === null && error === null && !isLoading)
- Reset during loading: sets isLoading to false and returns to empty state
- Reset after error: clears error and returns to empty state
- Reset after results: clears results and returns to empty state
- EmptyState: shown when `result === null && error === null && !isLoading`, hidden after prioritization
- Edge cases: exactly 20 tasks, exactly 0.5h/24h available time, null estimatedDurationMinutes displayed as "Not provided", allocatedMinutesToday=0 shows deferred state
- API route: request validation errors return 400, Bedrock failures return 502, invalid AI response returns 502
- Prompt construction: includes current date, includes timezone, includes all tasks, includes strict no-fabrication duration rule

### Integration Tests

- Full flow: submit form → API route → mocked Bedrock → rendered results
- Error flow: submit form → API route → Bedrock failure → error display with retry

### What Is NOT Tested

- Bedrock AI output quality (non-deterministic, tested manually)
- Visual styling/responsive layout (manual testing + browser dev tools)
- Amplify deployment (tested by deploying)
