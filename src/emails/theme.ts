export const light = {
    background: "#f5f7fa",
    card: "#ffffff",
    textPrimary: "#23243a",
    textSecondary: "#4a4d66",
    primary: "#a7d8ff",
    muted: "#e3e5ec",
    accent: "#8cc5ff",
    border: "#d3d5de",
};

export const dark = {
    background: "#1c1b29",
    card: "#2a2b3e",
    textPrimary: "#f2f4ff",
    textSecondary: "#b9bbd2",
    primary: "#a7d8ff",
    muted: "#3a3b4f",
    accent: "#8cc5ff",
    border: "#3f4054",
};

// --------------------------
// 🌗 Email Base Style Block
// --------------------------
export const baseEmailStyles = `
  body {
    margin: 0;
    padding: 0;
    background: ${light.background};
    font-family: -apple-system, BlinkMacSystemFont, "Raleway", sans-serif;
    color: ${light.textPrimary};
  }
  .container {
    max-width: 600px;
    margin: 40px auto;
    background: ${light.card};
    border-radius: 12px;
    padding: 32px 28px;
    border: 1px solid ${light.border};
  }
  p {
    font-size: 15px;
    line-height: 1.6;
    margin: 12px 0;
    color: ${light.textSecondary};
  }
  .header {
    text-align: center;
    margin-bottom: 28px;
  }
  .header img {
    width: 48px;
    margin-bottom: 12px;
  }
  .title {
    font-size: 22px;
    font-weight: 700;
    margin: 0;
  }
  .details {
    background: ${light.muted};
    padding: 18px;
    border-radius: 10px;
    margin: 28px 0;
  }
  .label {
    font-weight: 600;
    color: ${light.textPrimary};
  }
  .footer {
    text-align: center;
    font-size: 13px;
    color: ${light.textSecondary};
    margin-top: 32px;
  }
  .brand {
    color: ${light.accent};
    font-weight: 600;
  }

  /* DARK MODE */
  @media (prefers-color-scheme: dark) {
    body {
      background: ${dark.background} !important;
      color: ${dark.textPrimary} !important;
    }
    .container {
      background: ${dark.card} !important;
      border-color: ${dark.border} !important;
    }
    p {
      color: ${dark.textSecondary} !important;
    }
    .title {
      color: ${dark.primary} !important;
    }
    .details {
      background: ${dark.muted} !important;
    }
    .label {
      color: ${dark.textPrimary} !important;
    }
    .footer {
      color: ${dark.textSecondary} !important;
    }
    .brand {
      color: ${dark.accent} !important;
    }
  }

  /* Outlook/Gmail Dark Mode Fix */
  [data-ogsc] body {
    background: ${dark.background} !important;
    color: ${dark.textPrimary} !important;
  }
  [data-ogsc] .container {
    background: ${dark.card} !important;
    border-color: ${dark.border} !important;
  }
  [data-ogsc] p {
    color: ${dark.textSecondary} !important;
  }
  [data-ogsc] .details {
    background: ${dark.muted} !important;
  }
  [data-ogsc] .label {
    color: ${dark.textPrimary} !important;
  }
  [data-ogsc] .brand {
    color: ${dark.accent} !important;
  }
`;

// --------------------------
// 🧱 COMPONENTS
// --------------------------

export const emailHeader = (title: string) => `
  <div class="header">
    <img src="https://res.cloudinary.com/dpmx02shl/image/upload/v1764002161/logo_mx1dfi.png" alt="Trade Lave Logo" />
    <h1 class="title">${title}</h1>
  </div>
`;

export const detailsBox = (rows: { label: string; value: string | number; isLink?: boolean }[]) => `
  <div class="details">
    ${rows
        .map(
            (r) => `
      <p>
        <span class="label">${r.label}:</span> ${r.isLink
                    ? `<a href="${r.value}" style="color:${light.primary}; text-decoration:none;">${r.value}</a>`
                    : r.value
                }
      </p>`
        )
        .join("")}
  </div>
`;

export const statusBlock = (opts: {
    border: string;
    bg: string;
    text: string;
    heading: string;
    bullets: string[];
}) => `
  <div style=" padding:12px; border-left:4px solid ${opts.border}; background:${opts.bg}; border-radius:6px; margin-bottom:16px;">
    <p style="margin:0 0 8px; font-weight:600; color:${opts.text};">
      ${opts.heading}
    </p>
    ${opts.bullets
        .map((b) => `<p style="margin:0 0 8px;">${b}</p>`)
        .join("")}
  </div>
`;

export const securityFooter = `
  <div style="font-size:13px;">
    <p><strong>Security tip:</strong> We will never ask for your private keys or seed phrase.</p>
    <p>Need help? Contact <a href="mailto:support@tradelave.com" style="color:${light.primary}; text-decoration:none;">Trade Lave Support</a>.</p>
  </div>
`;

export const brandFooter = `
  <div class="footer">
    &copy; ${new Date().getFullYear()} <span class="brand">Trade Lave</span>. All rights reserved.
  </div>
`;
