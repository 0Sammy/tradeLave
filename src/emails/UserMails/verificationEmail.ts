import { baseEmailStyles, emailHeader, statusBlock, securityFooter, brandFooter, light, dark } from "../theme";

export default ({ name, verificationCode }: { name: string; verificationCode: string }) => ({

  subject: "Verify Your Email Address",
  html: `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Verification</title>

  <style>
    ${baseEmailStyles}

    .code-box {
      text-align: center;
      padding: 20px 0;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 4px;
      background: ${light.muted};
      border-radius: 10px;
      margin: 24px 0;
      color: ${light.textPrimary};
    }

    @media (prefers-color-scheme: dark) {
      .code-box {
        background: ${dark.muted} !important;
        color: ${dark.textPrimary} !important;
      }
    }

    [data-ogsc] .code-box {
      background: ${dark.muted} !important;
      color: ${dark.textPrimary} !important;
    }
  </style>
</head>

<body>
  <div class="container">

    ${emailHeader("Verify Your Email Address")}

    <p>Hi <strong>${name}</strong>,</p>

    <p>
      To ensure the security of your Trade Lave account, we require verification
      of your email address. This helps protect your identity and keeps our
      community safe.
    </p>

    <div class="code-box">${verificationCode}</div>
    <p>This code is valid for <strong>10 minutes</strong>.</p>

    ${statusBlock({
    heading: "What to Expect After Verification",
    border: "#3b82f6",
    bg: "#eff6ff",
    text: "#1d4ed8",
    bullets: [
      "Enhanced account security",
      "High priority support",
      "Access to all features, including exclusive tools",
    ],
  })}

    ${statusBlock({
    heading: "Why Verify?",
    border: "#f59e0b",
    bg: "#fff7ed",
    text: "#9a3412",
    bullets: [
      "Confirms your email address is valid",
      "Helps prevent unauthorized account access",
    ],
  })}

    <p>If you have any questions or encounter issues, our Support Team is here to assist you anytime.</p>

    <p>Warm regards,<br/>The Trade Lave Team</p>

    ${securityFooter}
    ${brandFooter}

  </div>
</body>

</html>`,
});