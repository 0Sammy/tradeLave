import { baseEmailStyles, emailHeader, securityFooter, brandFooter, light } from "../theme";

export default ({ name, verificationCode }: { name: string; verificationCode: string }) => ({

  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Recovery</title>

  <style>
    ${baseEmailStyles}

    .code-box {
      text-align: center;
      padding: 18px 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 4px;
      background: ${light.muted};
      border-radius: 10px;
      margin: 22px 0;
      color: ${light.textPrimary};
    }
  </style>
</head>

<body>
  <div class="container">
    ${emailHeader("Password Recovery")}

    <p>Hi ${name},</p>

    <p>
      A request was made to reset your Trade Lave account password. To confirm
      this request, please use the verification code below. If you did not
      request a password reset, you can safely ignore this email.
    </p>

    <div class="code-box">${verificationCode}</div>

    ${securityFooter}
    ${brandFooter}
  </div>
</body>
</html>`,
});
