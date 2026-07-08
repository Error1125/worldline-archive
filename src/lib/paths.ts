export const base = import.meta.env.BASE_URL;

export function withBase(path: string | undefined | null) {
  if (!path) return base;
  if (/^(https?:)?\/\//.test(path)) return path;
  if (path.startsWith("mailto:") || path.startsWith("tel:") || path.startsWith("#")) return path;

  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedBase === "") return normalizedPath;
  return `${normalizedBase}${normalizedPath}`;
}
