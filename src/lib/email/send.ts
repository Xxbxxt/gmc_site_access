import { sendMail } from "@/lib/azure/graph-mail";
import type { EmailTemplate } from "@/lib/email/templates";

export async function sendEmail(template: EmailTemplate): Promise<boolean> {
  try {
    await sendMail({
      to: template.to,
      subject: template.subject,
      html: template.html,
    });
    return true;
  } catch (error) {
    console.error("[email]", error);
    return false;
  }
}
