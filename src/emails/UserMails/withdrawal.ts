import { baseEmailStyles, emailHeader, detailsBox, statusBlock, securityFooter, brandFooter } from "../theme";

export default function withdrawalEmail({ name, coin, amount, coinAmount, walletAddress, date, status }: WithdrawalEmailParams) {

  const upper = coin.toUpperCase();

  const statuses = {
    successful: {
      heading: "Status: Successful",
      border: "#28a745",
      bg: "#eefaf1",
      text: "#155724",
      bullets: [
        "Your withdrawal was confirmed on the blockchain.",
        "Funds have reached the destination wallet.",
      ],
    },
    pending: {
      heading: "Status: Pending",
      border: "#f0ad4e",
      bg: "#fff7ea",
      text: "#8a6d3b",
      bullets: [
        "Network is still processing your withdrawal.",
        "This may take several minutes.",
      ],
    },
    failed: {
      heading: "Status: Failed",
      border: "#d9534f",
      bg: "#fff5f5",
      text: "#721c24",
      bullets: [
        "Your withdrawal could not be processed.",
        "Verify the wallet address or contact support.",
      ],
    },
  };

  const s = statuses[status];

  return {
    subject: `${upper} Withdrawal ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    html: `
<!DOCTYPE html>
<html lang="en" data-ogsc>
<head>
<meta charset="UTF-8" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>${baseEmailStyles}</style>
</head>

<body>
<div class="container">

  ${emailHeader("Withdrawal Notification")}

  <p>Hi <strong>${name}</strong>,</p>
  <p>Your withdrawal request has been processed with the details below.</p>

  ${detailsBox([
      { label: "Coin", value: upper },
      { label: "Amount", value: amount.toLocaleString() },
      { label: "Coin Equivalent", value: coinAmount },
      { label: "Wallet", value: walletAddress },
      { label: "Date", value: date },
    ])}

  ${statusBlock(s)}

  ${securityFooter}
  ${brandFooter}

</div>
</body>
</html>
    `,
  };
}
