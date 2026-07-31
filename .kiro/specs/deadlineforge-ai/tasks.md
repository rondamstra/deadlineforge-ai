# Implementation Plan: DeadlineForge AI

## Overview

Implement a single-page Next.js application that accepts tasks with optional deadlines/durations, sends them to Amazon Bedrock Nova Lite via the Converse API, and displays an AI-prioritized plan. The implementation follows a bottom-up approach: shared schemas and constants first, then the API route, then UI components, and finally wiring everything together in the page component.

## Tasks

- [x] 1. Set up shared libraries and install dependencies
  - [x] 1.1 Install runtime and dev dependencies
    - Install `zod` and `@aws-sdk/client-bedrock-runtime` as dependencies
    - Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `fast-check`, and `jsdom` as dev dependencies
    - Add `"test": "vitest --run"` script to package.json
    - Create `vitest.config.ts` with jsdom environment for React component tests
    - _Requirements: N/A (project setup)_

  - [x] 1.2 Create shared Zod schemas in `lib/schemas.ts`
    - Define `PrioritizeRequestSchema` with tasks array (1-20 non-empty strings) and availableTimeHours (0.5-24, default 4)
    - Define `UrgencyLevel` enum (Critical, High, Medium, Low)
    - Define `PrioritizedTaskSchema` with rank, taskDescription, urgency, reason, estimatedDurationMinutes (nullable), allocatedMinutesToday, assumptions
    - Define `PrioritizeResponseSchema` with summary, tasks array (1-20), and warnings array
    - Export TypeScript types inferred from schemas
    - _Requirements: 1.1, 1.7, 3.5, 3.8, 3.9_

  - [x] 1.3 Create constants in `lib/constants.ts`
    - Define and export `EXAMPLE_TASKS` string constant with the four example tasks
    - _Requirements: 8.2_

- [x] 2. Implement API route and Bedrock integration
  - [x] 2.1 Create the API route handler at `app/api/prioritize/route.ts`
    - Set `export const runtime = "nodejs"`
    - Implement `POST` handler that: parses request JSON, validates with `PrioritizeRequestSchema`
    - Check `PRIORITIZE_FUNCTION_URL` environment variable is configured (else 500)
    - Log safe pre-invocation diagnostics (task count, available time — no user text)
    - Invoke the Lambda function URL via `fetch()` with tasks and availableTimeHours
    - Handle function invocation errors (network, non-OK status) → 502
    - Parse function response `{success, responseText?, error?}`
    - Map known AWS errors (AccessDeniedException, ResourceNotFoundException, ValidationException, CredentialsProviderError) → 502
    - Parse responseText as JSON, validate with `PrioritizeResponseSchema`
    - Return validated data on success (200), appropriate error responses for failures
    - Safe console.error logging in every catch path (no user text, no prompts, no credentials)
    - _Requirements: 3.1, 3.8, 3.9, 3.10, 5.1, 5.2, 7.4, 11.4, 11.5_

  - [ ]* 2.2 Write property tests for schemas
    - **Property 2: Request schema accepts valid inputs and rejects invalid ones**
    - **Property 4: Response schema validates well-formed responses and permits null durations**
    - Use fast-check to generate valid and invalid request/response objects
    - Verify PrioritizeRequestSchema accepts valid inputs and rejects invalid ones
    - Verify PrioritizeResponseSchema accepts well-formed responses (including null durations) and rejects malformed ones
    - **Validates: Requirements 1.1, 1.7, 3.5, 3.8, 3.9, 3.10**

  - [ ]* 2.3 Write unit tests for the API route
    - Test request validation: empty tasks → 400, >20 tasks → 400, invalid availableTimeHours → 400
    - Test Bedrock failure handling → 502 with user-friendly message
    - Test invalid AI response → 502 with format error message
    - Test successful response → 200 with validated data
    - Mock `@aws-sdk/client-bedrock-runtime` for all API route tests
    - _Requirements: 3.8, 3.9, 3.10, 5.1, 5.2_

  - [x] 2.4 Create Amplify Gen 2 Lambda function for Bedrock
    - Create `amplify/functions/prioritize/resource.ts` with defineFunction (30s timeout, 256MB, env vars for BEDROCK_MODEL_ID and BEDROCK_REGION)
    - Create `amplify/functions/prioritize/handler.ts` with Bedrock Converse API call logic
    - Update `amplify/backend.ts` to register function, grant bedrock:InvokeModel via CDK PolicyStatement, create function URL with CORS
    - Output function URL via backend.addOutput for configuration
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9, 3.10, 3.11, 3.12, 11.1, 11.2, 11.3_

- [x] 3. Implement UI components
  - [x] 3.1 Create `components/Header.tsx`
    - Render "DeadlineForge AI" as the application name in a styled header element
    - _Requirements: 6.4_

  - [x] 3.2 Create `components/EmptyState.tsx`
    - Display a friendly placeholder explaining: paste your tasks, optionally set available time, and click "Prioritize My Tasks"
    - _Requirements: 9.1, 9.3_

  - [x] 3.3 Create `components/TaskForm.tsx`
    - Textarea for task input with placeholder text
    - Numeric input for "Available time today" defaulting to 4 hours (0.5-24 range)
    - Submit button labeled "Prioritize My Tasks"
    - Client-side validation: at least 1 non-empty task, max 20 tasks, total length ≤ 5000 chars, available time in range
    - Display inline validation messages adjacent to relevant inputs
    - Disable submit button when no valid tasks or while loading
    - Accept `taskText`, `availableTime`, `isLoading`, `onTaskTextChange`, `onAvailableTimeChange`, `onSubmit` props
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.3, 2.4, 2.5_

  - [x] 3.4 Create `components/ExampleTasksButton.tsx` and `components/ResetButton.tsx`
    - ExampleTasksButton: "Use Example Tasks" button that calls `onLoadExample` handler
    - ResetButton: "Reset" button that calls `onReset` handler
    - Both buttons positioned above the task input textarea
    - _Requirements: 8.1, 8.3, 10.1, 10.7, 10.8_

  - [x] 3.5 Create `components/LoadingIndicator.tsx`
    - Display a visible loading indicator with text "Prioritizing your tasks..."
    - _Requirements: 2.3_

  - [x] 3.6 Create `components/ErrorDisplay.tsx`
    - Display user-friendly error message (no raw codes or stack traces)
    - Include a retry button that calls `onRetry` handler
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [x] 3.7 Create `components/TaskCard.tsx`
    - Display: priority rank, urgency level badge, task description, reason, estimatedDurationMinutes (or "Not provided" if null), allocatedMinutesToday, and assumptions
    - Visually distinguish urgency levels (Critical, High, Medium, Low) with distinct colors
    - Show "Not provided" when estimatedDurationMinutes is null
    - Visually indicate deferred tasks (allocatedMinutesToday === 0)
    - Display assumptions within the card when present
    - _Requirements: 4.2, 4.4, 4.5, 4.6, 4.7_

  - [x] 3.8 Create `components/Summary.tsx`, `components/WarningsList.tsx`, and `components/ResultsDisplay.tsx`
    - Summary: renders the plan summary string at the top of results
    - WarningsList: renders warnings array prominently above task cards
    - ResultsDisplay: container that composes Summary, WarningsList, and TaskCard list in priority order
    - _Requirements: 4.1, 4.3, 4.8_

- [x] 4. Checkpoint - Ensure all components compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Wire page component and integrate all functionality
  - [x] 5.1 Implement `app/page.tsx` with full state management
    - Add "use client" directive
    - Declare all state: taskText, availableTime, isLoading, result, error
    - Implement `handleSubmit`: parse task lines, POST to `/api/prioritize`, handle success/error
    - Implement `handleLoadExample`: fill textarea with EXAMPLE_TASKS constant (no auto-submit)
    - Implement `handleReset`: clear all state to initial values (taskText="", availableTime=4, result=null, error=null, isLoading=false) without page refresh
    - Implement `handleRetry`: re-submit last request preserving input values
    - Render components in correct layout order: Header, ExampleTasksButton + ResetButton, TaskForm, conditional results area (EmptyState | LoadingIndicator | ErrorDisplay | ResultsDisplay)
    - Single-column layout, responsive 320px–1440px, Tailwind CSS styling
    - Conditional rendering: EmptyState when no result/error/loading, LoadingIndicator when loading, ErrorDisplay when error, ResultsDisplay when result
    - _Requirements: 1.4, 1.8, 2.2, 5.4, 6.1, 6.2, 6.3, 6.5, 7.1, 7.2, 7.3, 7.5, 8.2, 8.4, 8.5, 9.2, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 5.2 Write property test for task line parsing
    - **Property 1: Task line parsing preserves all non-whitespace content**
    - Use fast-check to generate multi-line strings
    - Verify parsing produces only non-empty, non-whitespace strings
    - Verify every non-whitespace line from input appears in output
    - **Validates: Requirements 1.4**

  - [ ]* 5.3 Write property test for allocation time invariant
    - **Property 3: Allocation time invariant**
    - Use fast-check to generate valid PrioritizeResponse objects with known availableTimeHours
    - Verify sum of allocatedMinutesToday across all tasks does not exceed availableTimeHours * 60
    - **Validates: Requirements 3.6, 3.12**

  - [ ]* 5.4 Write unit tests for page interactions
    - Test: clicking "Use Example Tasks" fills textarea with EXAMPLE_TASKS, does not auto-submit
    - Test: clicking "Reset" clears all state, returns to EmptyState
    - Test: submit with valid tasks shows loading then results
    - Test: submit failure shows ErrorDisplay, retry re-submits
    - Test: EmptyState shown initially (result === null && error === null && !isLoading)
    - Test: null estimatedDurationMinutes displays "Not provided"
    - Test: allocatedMinutesToday === 0 shows deferred indicator
    - _Requirements: 8.2, 8.3, 8.5, 10.2, 10.3, 10.4, 10.5, 10.6, 9.1, 9.2_

- [x] 6. Deployment configuration
  - [x] 6.1 Create `amplify.yml` build spec
    - Configure preBuild phase with `npm install` (not npm ci, due to npm 11 workspace issues)
    - Configure build phase with `npm run build`
    - Set artifacts baseDirectory to `.next` with all files
    - Configure cache for `node_modules` and `.next/cache`
    - _Requirements: 11.6_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The API route uses standard Node.js runtime (not Edge) for AWS SDK compatibility
- All state lives in React useState — no persistence, no external state management
- Zod schemas are shared between client and server for type safety

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "3.1", "3.2", "3.4", "3.5", "3.6"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.3", "3.7", "3.8"] },
    { "id": 4, "tasks": ["5.1", "6.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4"] }
  ]
}
```
