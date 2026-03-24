export function formatPrice(raw: bigint): string {
  const usd = Number(raw) / 1e18 / 1e6;
  if (usd < 0.000001) return "$" + usd.toExponential(3);
  if (usd < 0.01)     return "$" + usd.toFixed(8);
  return "$" + usd.toFixed(6);
}

export function formatMcap(raw: bigint): string {
  const usd = Number(raw) / 1e6;
  if (usd >= 1_000_000) return "$" + (usd / 1_000_000).toFixed(2) + "M";
  if (usd >= 1_000)     return "$" + (usd / 1_000).toFixed(2) + "K";
  return "$" + usd.toFixed(2);
}

export function formatProgress(raw: bigint): number {
  return Math.min(100, Number(raw));
}

export function formatTokens(raw: bigint): string {
  const n = Number(raw) / 1e18;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(2) + "K";
  return n.toFixed(2);
}
