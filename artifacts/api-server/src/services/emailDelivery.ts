import { ReplitConnectors } from "@replit/connectors-sdk";

type VerificationEmail = {
  to: string;
  code: string;
};

export type FeedbackNotification = {
  id: string;
  createdAt: Date;
  category: string;
  message: string;
  page: string | null;
  userEmail: string | null;
};

const testVerificationCodes = new Map<string, string>();
const TEST_EMAIL_DOMAIN = "@e2e.discipleos.test";
const FEEDBACK_NOTIFICATION_FROM = "DiscipleOS Feedback <feedback@discipleos.app>";
const FEEDBACK_NOTIFICATION_TO = "jeremiah.cas.lytle.johnson@gmail.com";

/**
 * Browser tests use a reserved domain so local/dev verification can exercise
 * the real request and session flow without sending an email or exposing
 * provider content. This is deliberately disabled in production.
 */
export function isTestVerificationEmail(email: string) {
  return process.env.NODE_ENV !== "production" && email.endsWith(TEST_EMAIL_DOMAIN);
}

export function takeTestVerificationCode(email: string) {
  if (!isTestVerificationEmail(email)) return null;
  const code = testVerificationCodes.get(email) ?? null;
  if (code) testVerificationCodes.delete(email);
  return code;
}

export function clearTestVerificationCode(email: string) {
  if (isTestVerificationEmail(email)) {
    testVerificationCodes.delete(email);
  }
}

export class EmailDeliveryNotConfiguredError extends Error {
  constructor() {
    super(
      "Email delivery is not configured. Connect Resend and set RESEND_FROM, or configure EMAIL_PROVIDER_URL, EMAIL_PROVIDER_API_KEY, and EMAIL_FROM.",
    );
    this.name = "EmailDeliveryNotConfiguredError";
  }
}

export class EmailDeliveryFailedError extends Error {
  constructor() {
    super("The verification email could not be delivered.");
    this.name = "EmailDeliveryFailedError";
  }
}

function getResendConfig() {
  const from = process.env.RESEND_FROM;
  return from ? { from } : null;
}

function getGenericConfig() {
  const url = process.env.EMAIL_PROVIDER_URL;
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM;
  return url && apiKey && from ? { url, apiKey, from } : null;
}

export function isEmailDeliveryConfigured() {
  return Boolean(getResendConfig() || getGenericConfig());
}

export async function sendVerificationEmail({ to, code }: VerificationEmail) {
  if (isTestVerificationEmail(to)) {
    testVerificationCodes.set(to, code);
    return;
  }

  const resend = getResendConfig();
  const generic = getGenericConfig();
  if (!resend && !generic) throw new EmailDeliveryNotConfiguredError();

  const subject = "Your DiscipleOS verification code";
  const text = `Your DiscipleOS verification code is ${code}. It expires in 10 minutes and can only be used once.`;

  const response = resend
    ? await new ReplitConnectors().proxy("resend", "/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: resend.from,
          to: [to],
          subject,
          text,
        }),
      })
    : await fetch(generic!.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${generic!.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: generic!.from, to, subject, text }),
      });

  if (!response.ok) throw new EmailDeliveryFailedError();
}

export async function sendFeedbackNotification(feedback: FeedbackNotification) {
  const resend = getResendConfig();
  if (!resend) throw new EmailDeliveryNotConfiguredError();

  const submittedAt = feedback.createdAt.toISOString();
  const userEmail = feedback.userEmail?.trim() || "Anonymous user (no email available)";
  const page = feedback.page?.trim() || "Not provided";
  const subject = `[DiscipleOS feedback] ${feedback.category}`;
  const text = [
    "A new DiscipleOS feedback submission was received.",
    "",
    `Submission ID: ${feedback.id}`,
    `Date/time (UTC): ${submittedAt}`,
    `Category: ${feedback.category}`,
    `Page/source: ${page}`,
    `User email: ${userEmail}`,
    "",
    "Message:",
    feedback.message,
  ].join("\n");

  const response = await new ReplitConnectors().proxy("resend", "/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Resend uses this key to make retries safe if the provider accepted the
      // request but the app lost the response before recording success.
      "Idempotency-Key": `discipleos-feedback-${feedback.id}`,
    },
    body: JSON.stringify({
      from: FEEDBACK_NOTIFICATION_FROM,
      to: [FEEDBACK_NOTIFICATION_TO],
      subject,
      text,
    }),
  });

  if (!response.ok) throw new EmailDeliveryFailedError();
}
