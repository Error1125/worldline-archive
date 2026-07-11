export function normalizeEmailHref(raw: string | undefined | null): string {
  const address = (raw ?? "").trim().replace(/^mailto:/i, "");
  return /^[^\s@]+@[^\s@]+$/.test(address) ? `mailto:${address}` : "";
}

export function emailAddress(raw: string | undefined | null): string {
  return (raw ?? "").trim().replace(/^mailto:/i, "");
}
