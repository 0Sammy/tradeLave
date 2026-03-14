import { baseEmailStyles, securityFooter, brandFooter } from "../theme";

const formatLabel = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const renderDetailsTable = (details: Record<string, string | number | object>) => {
  const rows = Object.entries(details)
    .map(
      ([key, value]) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; width: 42%; vertical-align: top; color: #6b7280; font-size: 14px; font-weight: 600;">
            ${formatLabel(key)}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">
            ${value}
          </td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="margin: 24px 0; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rows}
      </table>
    </div>
  `;
};

export default function generalTemplate(details: Record<string, string | number | object>) {
  return {
    intro: "A New Admin notification was triggered on Trade Lave.",
    html: `<!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>
                    ${baseEmailStyles}
                </style>
                </head>
                <body>
                    <div class="container">

                    <p>Hello Admin,</p>
    
                    ${renderDetailsTable(details)}

                    ${securityFooter}
                    ${brandFooter}

                    </div>
                </body>
                </html>`,
  };
}