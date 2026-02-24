export interface AlertEmailItem {
  name: string;
  next_reminder_date: string;
  daysUntil: number;
  purchase_url: string;
}

function buyNowUrl(itemName: string, purchaseUrl?: string): string {
  if (purchaseUrl) return purchaseUrl;
  const searchUrl = new URL("https://www.amazon.com/s");
  searchUrl.searchParams.set("k", itemName);
  return searchUrl.toString();
}

function badge(days: number): { label: string; bg: string; color: string } {
  if (days < 0) {
    const abs = Math.abs(days);
    return {
      label: `${abs} day${abs !== 1 ? "s" : ""} overdue`,
      bg: "#e03131",
      color: "#ffffff",
    };
  }
  if (days === 0) {
    return { label: "Due today", bg: "#FF692D", color: "#ffffff" };
  }
  return {
    label: `Due in ${days} day${days !== 1 ? "s" : ""}`,
    bg: "#e8f4f8",
    color: "#00a2c7",
  };
}

export function buildInventoryAlertEmail(
  userName: string,
  items: AlertEmailItem[],
  siteUrl?: string
): string {
  const logoUrl = siteUrl ? `${siteUrl}/icon-512.png` : "";
  const rows = items
    .map((item) => {
      const b = badge(item.daysUntil);
      const url = buyNowUrl(item.name, item.purchase_url);
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #efece9;font-size:14px;color:#22201d;">
            ${escapeHtml(item.name)}
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #efece9;text-align:center;">
            <span style="display:inline-block;padding:3px 10px;border-radius:9999px;font-size:12px;font-weight:500;background:${b.bg};color:${b.color};">
              ${b.label}
            </span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #efece9;text-align:center;">
            <a href="${escapeHtml(url)}" style="display:inline-block;padding:6px 16px;border-radius:6px;background:#FF692D;color:#ffffff;font-size:12px;font-weight:600;text-decoration:none;">
              Buy Now
            </a>
          </td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Inter,system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td align="center" style="padding:28px 24px 20px;border-bottom:1px solid #efece9;">
            ${logoUrl ? `<img src="${logoUrl}" alt="HOMEBOT" width="120" height="120" style="display:block;margin:0 auto 12px;width:120px;height:120px;border-radius:14px;" />` : ""}
            <span style="display:block;font-size:20px;font-weight:700;color:#FF692D;">Home Inventory Alert</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 8px;font-size:15px;color:#22201d;">Hi ${escapeHtml(userName)},</p>
            <p style="margin:0 0 20px;font-size:14px;color:#84827f;">
              You have <strong style="color:#22201d;">${items.length}</strong> inventory item${items.length !== 1 ? "s" : ""} that need${items.length === 1 ? "s" : ""} attention:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #efece9;border-radius:10px;overflow:hidden;">
              <tr style="background:#f9f7f5;">
                <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#84827f;border-bottom:1px solid #efece9;">Item</th>
                <th style="padding:10px 16px;text-align:center;font-size:12px;font-weight:600;color:#84827f;border-bottom:1px solid #efece9;">Status</th>
                <th style="padding:10px 16px;text-align:center;font-size:12px;font-weight:600;color:#84827f;border-bottom:1px solid #efece9;">Action</th>
              </tr>
              ${rows}
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 24px 24px;border-top:1px solid #efece9;">
            <p style="margin:0;font-size:12px;color:#84827f;">
              You can manage notification preferences in your HOMEBOT Settings page.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
