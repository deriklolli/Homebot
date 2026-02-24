/**
 * Shared date formatting utilities.
 *
 * All functions accept date-only strings ("YYYY-MM-DD") or full ISO strings
 * and format them for US English display.
 */

/** "Jan 5, 2025" — compact format for lists and cards */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "January 5, 2025" — full format for detail pages */
export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "January 5, 2025" from a full ISO timestamp (uses native Date parsing) */
export function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "2:30 PM" from a "HH:MM" or "HH:MM:SS" time string */
export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
