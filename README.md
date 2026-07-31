# DeadlineForge AI

A lightweight single-page web application that uses Amazon Bedrock (Nova Lite) to prioritize your tasks. Paste your tasks with optional deadlines and durations, set your available time, and get an AI-generated prioritized plan.

## Features

- Paste or type up to 20 tasks with optional deadlines and estimated durations
- AI analyzes urgency, allocates time, and explains reasoning
- Visual urgency indicators (Critical, High, Medium, Low)
- Warns about risks like tight deadlines or overcommitment
- Stateless — no accounts, no data stored
- Example tasks for quick demo

## Architecture

```
Browser → Next.js API Route → Lambda Function URL → Amazon Bedrock (Nova Lite)
```

- **Frontend:** React + Tailwind CSS single-page app
- **API Route:** Validates requests with Zod, invokes the Lambda function URL
- **Lambda Function:** Calls Bedrock Converse API with proper IAM credentials
- **Deployment:** AWS Amplify Hosting (Gen 2 fullstack)

## Tech Stack

- Next.js 16 (App Router, Node.js runtime)
- React 19 + Tailwind CSS 4
- TypeScript + Zod for validation
- Amazon Bedrock (Nova Lite) via Converse API
- AWS Lambda (Amplify Gen 2 function)
- AWS Amplify Hosting

## Getting Started

### Prerequisites

- Node.js 20+
- npm 11+
- AWS account with Bedrock model access (amazon.nova-lite-v1:0 in us-east-1)

### Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

Note: The AI prioritization feature requires the Lambda function to be deployed. For local development, you can either:
- Run `npx ampx sandbox` to deploy a sandbox backend
- Or mock the `/api/prioritize` endpoint

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

## Deployment

### Deploy to AWS Amplify (Gen 2)

1. Push to a GitHub repository
2. In the AWS Amplify console, create a new app → connect your repo
3. Select **Gen 2** (fullstack) deployment
4. Amplify will detect `amplify/backend.ts` and deploy both frontend + backend
5. After first deploy, find the Lambda function URL in CloudFormation outputs
6. Set `PRIORITIZE_FUNCTION_URL` environment variable in the Amplify console
7. Redeploy

### Environment Variables

| Variable | Where | Required | Default | Description |
|----------|-------|----------|---------|-------------|
| `PRIORITIZE_FUNCTION_URL` | Amplify console | Yes | — | Lambda function URL (set after first deploy) |
| `BEDROCK_REGION` | Lambda env (auto) | No | us-east-1 | AWS region for Bedrock |
| `BEDROCK_MODEL_ID` | Lambda env (auto) | No | amazon.nova-lite-v1:0 | Bedrock model ID |

### IAM Permissions

The Lambda function's execution role is automatically granted `bedrock:InvokeModel` permission via CDK in `amplify/backend.ts`. No manual IAM configuration needed after Gen 2 deployment.

### Bedrock Model Access

Ensure the model `amazon.nova-lite-v1:0` is enabled in the Amazon Bedrock console (us-east-1 → Model access → Request access).

## Project Structure

```
deadlineforge-ai/
├── amplify/                      # Amplify Gen 2 backend
│   ├── backend.ts                # Backend definition + CDK policy + function URL
│   ├── functions/prioritize/
│   │   ├── resource.ts           # Lambda function definition
│   │   └── handler.ts           # Bedrock Converse API handler
│   └── package.json
├── app/
│   ├── api/prioritize/route.ts   # API route (validates → calls Lambda → validates)
│   ├── layout.tsx
│   └── page.tsx                  # Main page (client state management)
├── components/                   # React UI components
├── lib/
│   ├── schemas.ts                # Shared Zod schemas
│   └── constants.ts              # Example tasks
├── amplify.yml                   # Build spec
└── package.json
```

## How It Works

1. User enters tasks (one per line) with optional deadlines and durations
2. Client validates input and sends POST to `/api/prioritize`
3. API route validates with Zod, calls the Lambda function URL
4. Lambda constructs a prompt with current date/time and strict JSON instructions
5. Bedrock Nova Lite returns a prioritized plan as JSON
6. API route validates the response with Zod and returns to the client
7. UI renders prioritized tasks with urgency badges, time allocations, and warnings

## License

MIT
