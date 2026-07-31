import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

const BEDROCK_REGION = process.env.BEDROCK_REGION || "us-east-1";
const MODEL_ID = process.env.BEDROCK_MODEL_ID || "amazon.nova-lite-v1:0";

const client = new BedrockRuntimeClient({ region: BEDROCK_REGION });

interface PrioritizeEvent {
  tasks: string[];
  availableTimeHours: number;
}

interface PrioritizeResult {
  success: boolean;
  responseText?: string;
  error?: { name: string; message: string };
}

export const handler = async (
  event: PrioritizeEvent
): Promise<PrioritizeResult> => {
  const { tasks, availableTimeHours } = event;

  console.error("[prioritize-fn] Invoking Bedrock", {
    region: BEDROCK_REGION,
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

  const userMessage = `I have ${availableTimeHours} hours available today. Please prioritize these tasks:\n\n${tasks.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}`;

  try {
    const command = new ConverseCommand({
      modelId: MODEL_ID,
      messages: [{ role: "user", content: [{ text: userMessage }] }],
      system: [{ text: systemPrompt }],
      inferenceConfig: { maxTokens: 4096, temperature: 0.3 },
    });

    const response = await client.send(command);
    const responseText = response.output?.message?.content?.[0]?.text;

    if (!responseText) {
      console.error("[prioritize-fn] Bedrock returned empty response text");
      return {
        success: false,
        error: {
          name: "EmptyResponse",
          message: "Bedrock returned empty response text",
        },
      };
    }

    return { success: true, responseText };
  } catch (err: unknown) {
    const error = err as {
      name?: string;
      message?: string;
      $metadata?: { httpStatusCode?: number; requestId?: string };
    };
    console.error("[prioritize-fn] Bedrock call failed", {
      name: error.name,
      message: error.message,
      httpStatusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
    });
    return {
      success: false,
      error: {
        name: error.name || "UnknownError",
        message: error.message || "Unknown error",
      },
    };
  }
};
