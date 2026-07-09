import { ClientSecretCredential } from "@azure/identity";

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID!,
  process.env.AZURE_CLIENT_ID!,
  process.env.AZURE_CLIENT_SECRET!,
);

const TOKEN_TIMEOUT_MS = 10_000;
const SEND_TIMEOUT_MS = 10_000;

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendMail({
  to,
  subject,
  html,
}: SendMailInput): Promise<void> {
  const token = await credential.getToken(
    "https://graph.microsoft.com/.default",
    {
      abortSignal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
    },
  );
  const senderEmail = process.env.GRAPH_SENDER_EMAIL!;

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: html },
          toRecipients: [{ emailAddress: { address: to } }],
        },
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Graph sendMail failed (${response.status}): ${body}`);
  }
}
