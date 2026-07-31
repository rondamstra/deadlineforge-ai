import { defineFunction } from "@aws-amplify/backend";

export const prioritizeFunction = defineFunction({
  name: "prioritize",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  memoryMB: 256,
  environment: {
    BEDROCK_MODEL_ID: "amazon.nova-lite-v1:0",
    BEDROCK_REGION: "us-east-1",
  },
});
