import { defineBackend } from "@aws-amplify/backend";
import { prioritizeFunction } from "./functions/prioritize/resource";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { FunctionUrlAuthType, HttpMethod } from "aws-cdk-lib/aws-lambda";

const backend = defineBackend({
  prioritizeFunction,
});

// Grant the Lambda function permission to invoke Bedrock models
backend.prioritizeFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    sid: "AllowBedrockInvokeModel",
    effect: Effect.ALLOW,
    actions: ["bedrock:InvokeModel"],
    resources: [
      "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0",
    ],
  })
);

// Add a function URL so the Next.js route can invoke it without AWS credentials
const functionUrl = backend.prioritizeFunction.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ["*"],
    allowedMethods: [HttpMethod.POST],
    allowedHeaders: ["content-type"],
  },
});

// Output the function URL for the Next.js route to use
backend.addOutput({
  custom: {
    prioritizeFunctionUrl: functionUrl.url,
  },
});
