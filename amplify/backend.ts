import { defineBackend } from "@aws-amplify/backend";

/**
 * Minimal backend for DeadlineForge AI.
 * No auth or data resources needed.
 *
 * Amplify Gen 2 injects IAM credentials from the configured service role
 * into the SSR compute environment at runtime. The service role must have
 * bedrock:InvokeModel permission (configured in the Amplify console under
 * App settings → General → Service role).
 *
 * Required IAM policy for the service role:
 * {
 *   "Version": "2012-10-17",
 *   "Statement": [{
 *     "Effect": "Allow",
 *     "Action": ["bedrock:InvokeModel"],
 *     "Resource": ["arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0"]
 *   }]
 * }
 */
defineBackend({});
