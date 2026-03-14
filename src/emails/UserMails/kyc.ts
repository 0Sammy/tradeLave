import { baseEmailStyles, emailHeader, statusBlock, detailsBox, securityFooter, brandFooter, light, } from "../theme";

export default ({ name, status, reason }: KycEmailParams) => {

  const isApproved = status === "accepted";

  const approvedBlock = statusBlock({
    border: "#10b981",
    bg: "#e6f9f2",
    text: "#047857",
    heading: "KYC Approved",
    bullets: [
      "Your identity verification has been successfully approved.",
      "You now have full access to all platform features.",
    ],
  });

  const rejectedBlock = statusBlock({
    border: "#ef4444",
    bg: "#feecec",
    text: "#b91c1c",
    heading: "KYC Rejected",
    bullets: [
      "We were unable to verify your identity with the documents provided.",
      "Please review and resubmit the required documents.",
    ],
  });

  return {
    subject: isApproved
      ? "🎉 Your KYC Has Been Approved"
      : "⚠️ KYC Verification Rejected",

    html: `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KYC Status Update</title>

  <style>
    ${baseEmailStyles}

    .reason-label {
      font-weight: 600;
      color: ${light.textPrimary};
    }
  </style>
</head>

<body>
  <div class="container">
    ${emailHeader(`KYC ${isApproved ? "Approved" : "Rejected"}`)}

    <p>Hi <strong>${name}</strong>,</p>

    ${isApproved ? approvedBlock : rejectedBlock}

    ${!isApproved && reason
        ? detailsBox([
          {
            label: "Rejection Reason",
            value: reason,
          },
        ])
        : ""
      }

    ${!isApproved
        ? `<p>
         You may now review your documents and submit a new verification request.
         Our support team is available if you need assistance.
       </p>`
        : ""
      }

    ${securityFooter}
    ${brandFooter}
  </div>
</body>

</html>`,
  };
};
