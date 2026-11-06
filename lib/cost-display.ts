// Turns a stored local-currency cost string (for example "₹950") into a
// worldwide-neutral cost level, so the site never shows unverifiable local
// prices. $ is very cheap, $$$ is the top of hobby budgets.
export function displayCost(raw: string | null | undefined): string {
  if (!raw) return '';
  const n = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(n)) return String(raw);
  if (n < 400) return '$';
  if (n < 1500) return '$$';
  return '$$$';
}
