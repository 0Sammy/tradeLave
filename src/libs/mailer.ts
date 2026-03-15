import { Resend } from "resend";
import Bottleneck from "bottleneck";

// Config
import { RESEND_API, FROM_EMAIL, REPLY_EMAIL, ADMIN_EMAIL } from "../config";

const resend = new Resend(RESEND_API);

const limiter = new Bottleneck({
  minTime: 600,
  maxConcurrent: 1
});

export async function sendEmail({
  to,
  subject,
  html
}: {
  to: string;
  subject: string;
  html: string;
}) {
  return limiter.schedule(async () => {
    try {
      const data = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
        replyTo: REPLY_EMAIL
      });

      console.log("✅ Email sent:", data);
      return data;
    } catch (error) {
      console.error("❌ Email failed:", error);
      throw error;
    }
  });
}

export async function sendAdminEmail(html: string) {
  return limiter.schedule(async () => {
    try {
      const data = await resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: "Admin Notification",
        html
      });

      console.log("✅ Admin email sent:", data);
      return data;
    } catch (error) {
      console.error("❌ Admin email failed:", error);
      throw error;
    }
  });
}

limiter.on("failed", (error, jobInfo) => {
  console.log("The error:", error)
  console.log("Job failed:", jobInfo);
});