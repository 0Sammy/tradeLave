import { baseEmailStyles, emailHeader, detailsBox, statusBlock, securityFooter, brandFooter } from "../theme";

type StakeCreatedEmailParams = {
    name: string;
    coin: string;
    plan: string;
    capital: string;
    roi: number;
    returnAmount: string;
    durationInDays: number;
};

export default function investment({ name, coin, plan, capital, roi, returnAmount, durationInDays }: StakeCreatedEmailParams) {

    const upper = coin.toUpperCase();

    const status = {
        heading: "Stake Created Successfully",
        border: "#28a745",
        bg: "#eefaf1",
        text: "#155724",
        bullets: [
            `Your ${plan} plan stake is now active.`,
            `You will earn ${roi}% ROI over ${durationInDays} days.`,
            "Returns will be credited at the end of the staking period.",
        ],
    };

    return {
        subject: `${upper} Stake Activated (${plan} Plan)`,
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

  ${emailHeader("Stake Confirmation")}

  <p>Hi <strong>${name}</strong>,</p>
  <p>Your staking investment has been successfully created. Below are the details of your stake.</p>

  ${detailsBox([
            { label: "Coin", value: upper },
            { label: "Plan", value: plan },
            { label: "Capital", value: capital },
            { label: "ROI", value: `${roi}%` },
            { label: "Total Return", value: returnAmount },
            { label: "Duration", value: `${durationInDays} days` },
        ])}

  ${statusBlock(status)}

  <p>You can monitor this stake anytime from your dashboard.</p>

  ${securityFooter}
  ${brandFooter}

</div>
</body>
</html>
    `,
    };
}