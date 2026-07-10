export interface MarkdownImportResult {
  attributes: Record<string, unknown>;
  body: string;
}

const MAX_MARKDOWN_BYTES = 2 * 1024 * 1024;

function scalar(value: string): unknown {
  const text = value.trim();
  if (!text) return "";
  if (text === "true") return true;
  if (text === "false") return false;
  if (text === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (text.startsWith("[") && text.endsWith("]")) {
    const inner = text.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((part) => scalar(part));
  }
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"');
  }
  return text;
}

export function parseMarkdownImport(source: string): MarkdownImportResult {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (!normalized.startsWith("---\n")) return { attributes: {}, body: normalized };
  const end = normalized.indexOf("\n---\n", 4);
  if (end < 0) throw new Error("frontmatter 缺少结束分隔符 ---。");
  const attributes: Record<string, unknown> = {};
  for (const rawLine of normalized.slice(4, end).split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!match) throw new Error(`无法解析 frontmatter：${rawLine}`);
    attributes[match[1]] = scalar(match[2]);
  }
  return { attributes, body: normalized.slice(end + 5) };
}

export async function readMarkdownFile(file: File): Promise<MarkdownImportResult> {
  if (!/\.(md|mdx)$/i.test(file.name)) throw new Error("请选择 .md 或 .mdx 文件。");
  if (file.size > MAX_MARKDOWN_BYTES) throw new Error("文件超过 2 MB，已拒绝导入。");
  return parseMarkdownImport(await file.text());
}
