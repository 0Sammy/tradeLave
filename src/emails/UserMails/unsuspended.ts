import { baseEmailStyles, emailHeader, statusBlock, securityFooter, brandFooter } from "../theme";

export default ({ name }: { name: string }) => ({
  subject: "✅ Your Trade Lave Account Has Been Restored",

  html: `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Account Restored</title>

  <style>
    ${baseEmailStyles}
  </style>
</head>

<body>
  <div class="container">

    ${emailHeader("Account Restored")}

    <p>Hi <strong>${name}</strong>,</p>

    ${statusBlock({
    heading: "Your Account Has Been Successfully Reactivated",
    border: "#28a745",
    bg: "#e9f9ef",
    text: "#28a745",
    bullets: [
      "Your Trade Lave account has been restored.",
      "You now have full access to all services again.",
      "If this change seems incorrect, please reach out.",
    ],
  })}

    <p>If you have any questions or concerns, feel free to contact our support team anytime.</p>

    ${securityFooter}
    ${brandFooter}

  </div>
</body>

</html>`,
});
