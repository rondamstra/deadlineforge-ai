import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { PrioritizeRequestSchema, PrioritizeResponseSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

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

    const { tasks, availableTimeHours } = parsed.data;

    if (tasks.length > 20) {
      return Response.json(
        { error: "Maximum of 20 tasks allowed" },
        { status: 400 }
      );
    }

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

    const modelId = process.env.BEDROCK_MODEL_ID || "amazon.nova-lite-v1:0";
    const command = new ConverseCommand({
      modelId,
      messages: [{ role: "user", content: [{ text: userMessage }] }],
      system: [{ text: systemPrompt }],
      inferenceConfig: { maxTokens: 4096, temperature: 0.3 },
    });

    const response = await client.send(command);
    const assistantText = response.output?.message?.content?.[0]?.text;

    if (!assistantText) {
      return Response.json(
        { error: "The AI returned an unexpected response format. Please try again." },
        { status: 502 }
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(assistantText);
    } catch {
      return Response.json(
        { error: "The AI returned an unexpected response format. Please try again." },
        { status: 502 }
      );
    }

    const validated = PrioritizeResponseSchema.safeParse(parsedJson);
    if (!validated.success) {
      return Response.json(
        { error: "The AI returned an unexpected response format. Please try again." },
        { status: 502 }
      );
    }

    return Response.json(validated.data);
  } catch {
    return Response.json(
      { error: "The prioritization service is temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}
