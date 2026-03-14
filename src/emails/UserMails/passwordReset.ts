import { baseEmailStyles, emailHeader, statusBlock, securityFooter, brandFooter } from "../theme";

export default ({ name }: { name: string }) => ({
    subject: "✅ Your Trade Lave Password Has Been Reset",

    html: `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Password Reset Successful</title>

  <style>
    ${baseEmailStyles}
  </style>
</head>

<body>
  <div class="container">

    ${emailHeader("Password Reset Successful")}

    <p>Hi <strong>${name}</strong>,</p>

    <p>
      This is a confirmation that your Trade Lave account password has been
      <strong>successfully reset</strong>.
    </p>

    ${statusBlock({
        heading: "Password Updated",
        border: "#10b981",
        bg: "#ecfdf5",
        text: "#065f46",
        bullets: [
            "Your new password is now active.",
            "You can sign in immediately using your updated credentials.",
            "All previous password reset links are now invalid.",
        ],
    })}

    <p>
      If you initiated this change, no further action is required.
      If you did <strong>not</strong> authorize this update, please contact our
      support team immediately so we can help secure your account.
    </p>

    ${securityFooter}
    ${brandFooter}

  </div>
</body>

</html>`,
});
