import { baseEmailStyles, emailHeader, statusBlock, securityFooter, brandFooter, light, dark } from "../theme";

export default ({ name }: { name: string }) => ({
  subject: "🎉 Welcome to Trade Lave!",

  html: `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Trade Lave</title>

  <style>
    ${baseEmailStyles}

    .welcome-paragraph {
      font-size: 16px;
      line-height: 1.6;
      color: ${light.textSecondary};
    }

    .cta-btn {
      display: inline-block;
      padding: 12px 28px;
      background: ${light.primary};
      color: #000;
      text-decoration: none;
      border-radius: 25px;
      margin-top: 28px;
      font-weight: 600;
      text-align: center;
    }

    @media (prefers-color-scheme: dark) {
      .welcome-paragraph {
        color: ${dark.textSecondary} !important;
      }
      .cta-btn {
        background: ${dark.primary} !important;
        color: #000 !important;
      }
    }

    [data-ogsc] .welcome-paragraph {
      color: ${dark.textSecondary} !important;
    }

    [data-ogsc] .cta-btn {
      background: ${dark.primary} !important;
      color: #000 !important;
    }
  </style>
</head>

<body>
  <div class="container">

    ${emailHeader("Welcome to Trade Lave")}

    <p>Hello <strong>${name}</strong>,</p>

    <p class="welcome-paragraph">
      Welcome to <strong>Trade Lave</strong> — your secure and seamless gateway to the world of cryptocurrency!
      We're excited to have you join a growing community built on trust, innovation, and simplicity.
    </p>

    <p class="welcome-paragraph">
      Whether you're here to safely <strong>store</strong>, <strong>withdraw</strong>, <strong>receive</strong>, or
      <strong>stake</strong> your digital assets, you're in the right place.
    </p>

    ${statusBlock({
    heading: "Here's What You Can Expect:",
    border: light.primary,
    bg: light.muted,
    text: light.textPrimary,
    bullets: [
      "Easy and intuitive crypto asset management",
      "Instant sending, receiving, and staking operations",
      "A safe and secure payment system",
      "A dedicated community focused on high-quality service",
    ],
  })}

    <a href="https://tradelave.com" class="cta-btn">Continue Exploring</a>

    ${securityFooter}
    ${brandFooter}

  </div>
</body>

</html>`,
});
