import { baseEmailStyles, emailHeader, detailsBox, statusBlock, securityFooter, brandFooter } from "../theme";

export default ({ name, ip, userAgent, location, date }: {
  name: string;
  ip: string;
  userAgent: string;
  location: { city: string; region: string; country: string };
  date: string;
}) => ({
  subject: "🔐 New Login Alert",

  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login Alert</title>

  <style>
    ${baseEmailStyles}
  </style>
</head>

<body>
  <div class="container">
    ${emailHeader("New Login Detected")}

    <p>Hi <strong>${name}</strong>,</p>

    ${statusBlock({
    heading: "We detected a login to your account",
    border: "#f59e0b",
    bg: "#fff7ed",
    text: "#b45309",
    bullets: [
      "A new login session was initiated using the details shown below.",
      "If this was you, no action is required.",
      "If this was NOT you, please secure your account immediately.",
    ],
  })}

    ${detailsBox([
    { label: "IP Address", value: ip },
    {
      label: "Location",
      value: `${location.city}, ${location.region}, ${location.country}`,
    },
    { label: "Device", value: userAgent },
    { label: "Date & Time", value: date },
  ])}

    <p>
      If you did not authorize this login, please reset your password immediately
      and contact our support team for urgent assistance.
    </p>

    ${securityFooter}
    ${brandFooter}
  </div>
</body>
</html>`,
});
