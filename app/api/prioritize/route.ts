import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  PrioritizeRequestSchema,
  PrioritizeResponseSchema,
} from "@/lib/schemas";

export const runtime = "nodejs";

const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const MODEL_ID = process.env.BEDROCK_MODEL_ID || "amazon.nova-lite-v1:0";

const client = new BedrockRuntimeClient({
  region: AWS_REGION,
});

/**
 * Safely extract loggable details from an AWS SDK error.
 * Logs only name, message, httpStatusCode, and requestId — never credentials,
 * prompts, user data, or full responses.
 */
function logAwsError(label: string, error: unknown): void {
  const err = error as {
    name?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number; requestId?: string };
  };
  console.error(label, {
    name: err.name,
    message: err.message,
    httpStatusCode: err.$metadata?.httpStatusCode,
    requestId: err.$metadata?.requestId,
  });
}

/**
 * Check if an error is a known AWS SDK error by name.
 */
function isAwsSdkError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof (error as { name: unknown }).name === "string"
  );
}

const AWS_ERROR_NAMES_502 = new Set([
  "AccessDeniedException",
  "ResourceNotFoundException",
  "ValidationException",
]);

export async function POST(request: Request) {
  // --- Parse request body ---
  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
    console.error("[prioritize] Malformed request JSON", {
      message: err instanceof Error ? err.message : "unknown parse error",
    });
    return Response.json(
      { error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  // --- Validate request with Zod ---
  const parsed = PrioritizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[prioritize] Zod request validation failed", {
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        code: i.code,
        message: i.message,
      })),
    });
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Invalid request" },
      { status: 400 }
    );
  }

  const { tasks, availableTimeHours } = parsed.data;

  // --- Pre-Bedrock diagnostic log (safe: no user text, no prompts) ---
  console.error("[prioritize] Invoking Bedrock", {
    region: AWS_REGION,
    modelId: MODEL_ID,
    taskCount: tasks.length,
    availableTime: availableTimeHours,
  });

  const systemPrompt = `You are a task prioritization assistant. Your job is to analyze a list of tasks and produce a prioritized plan.

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
- Respond with ONLY the JSON object. No markdown, no explanation, no code fences.`;

  const userMessage = `I have ${availableTimeHours} hours available today. Please prioritize these tasks:\n\n${tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;

  // --- Call Bedrock ---
  let assistantText: string | undefined;
  try {
    const command = new ConverseCommand({
      modelId: MODEL_ID,
      messages: [{ role: "user", content: [{ text: userMessage }] }],
      system: [{ text: systemPrompt }],
      inferenceConfig: { maxTokens: 4096, temperature: 0.3 },
    });

    const response = await client.send(command);
    assistantText = response.output?.message?.content?.[0]?.text;
  } catch (err) {
    if (isAwsSdkError(err)) {
      const errName = (err as { name: string }).name;
      logAwsError("[prioritize] Bedrock call failed", err);

      if (AWS_ERROR_NAMES_502.has(errName)) {
        return Response.json(
          {
            error:
              "The prioritization service is temporarily unavailable. Please try again.",
          },
          { status: 502 }
        );
      }
    } else {
      console.error("[prioritize] Unexpected error calling Bedrock", {
        message: err instanceof Error ? err.message : "unknown error",
      });
    }

    return Response.json(
      {
        error:
          "The prioritization service encountered an unexpected error. Please try again later.",
      },
      { status: 500 }
    );
  }

  // --- Check for missing response text ---
  if (!assistantText) {
    console.error("[prioritize] Bedrock returned empty response text");
    return Response.json(
      {
        error:
          "The AI returned an unexpected response format. Please try again.",
      },
      { status: 502 }
    );
  }

  // --- Parse JSON from Bedrock response ---
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(assistantText);
  } catch (err) {
    console.error("[prioritize] Failed to parse Bedrock response as JSON", {
      message: err instanceof Error ? err.message : "unknown parse error",
    });
    return Response.json(
      {
        error:
          "The AI returned an unexpected response format. Please try again.",
      },
      { status: 502 }
    );
  }

  // --- Validate response with Zod ---
  const validated = PrioritizeResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    console.error("[prioritize] Zod response validation failed", {
      issues: validated.error.issues.map((i) => ({
        path: i.path,
        code: i.code,
        message: i.message,
      })),
    });
    return Response.json(
      {
        error:
          "The AI returned an unexpected response format. Please try again.",
      },
      { status: 502 }
    );
  }

  return Response.json(validated.data);
}
