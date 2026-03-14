import { Resend } from "resend";
import Bottleneck from "bottleneck";

// Config
import { RESEND_API, FROM_EMAIL, REPLY_EMAIL, ADMIN_EMAIL } from "../config";

const resend = new Resend(RESEND_API);

// By passing Resend rate limiting
const limiter = new Bottleneck({
  minTime: 500,
  maxConcurrent: 1
});

async function _sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      replyTo: REPLY_EMAIL,
    });

    console.log("✅ Email sent via Resend:", data);
    return data;
  } catch (error) {
    console.error("❌ Failed to send email via Resend:", error);
    throw error;
  }
}

async function _sendAdminEmail(html: string) {
  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: "Admin Notification",
      html,
    });

    console.log("✅ Admin Email sent via Resend:", data);
    return data;
  } catch (error) {
    console.error("❌ Failed to send email via Resend:", error);
    throw error;
  }
}

// Export wrapped versions
export const sendEmail = limiter.wrap(_sendEmail);
export const sendAdminEmail = limiter.wrap(_sendAdminEmail);