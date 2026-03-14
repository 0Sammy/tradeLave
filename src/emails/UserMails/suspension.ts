import { baseEmailStyles, emailHeader, statusBlock, securityFooter, brandFooter } from "../theme";

export default ({ name }: { name: string }) => ({
  subject: "🚫 Your Trade Lave Account Has Been Suspended",

  html: `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Account Suspended</title>

  <style>
    ${baseEmailStyles}
  </style>
</head>

<body>
  <div class="container">

    ${emailHeader("Account Suspended")}

    <p>Dear <strong>${name}</strong>,</p>

    ${statusBlock({
    heading: "Your Account Has Been Suspended",
    border: "#d9534f",
    bg: "#fff5f5",
    text: "#721c24",
    bullets: [
      "Suspicious or policy-violating activity was detected on your account.",
      "Your account access has been temporarily restricted for safety.",
      "You may be required to verify your identity or provide further information.",
    ],
  })}

    <p>
      If you believe this action was taken in error, please contact our support team immediately
      so we can review and resolve the issue as quickly as possible.
    </p>

    ${securityFooter}
    ${brandFooter}

  </div>
</body>

</html>`,
});
