export function splitDoc(content: string) {
  const match = content.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  return match ? { fm: match[1], body: match[2] ?? "" } : null;
}
export function scalar(fm: string, key: string) {
  const value = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim();
  return value?.replace(/^"(.*)"$/, "$1");
}
export function githubAssociation(fm: string) {
  const block = fm.match(/^github:\s*\n((?:\s+.+\n?)*)/m)?.[1] ?? "";
  const owner = block.match(/^\s+owner:\s*["']?([^"'\n]+)["']?/m)?.[1]?.trim();
  const repo = block.match(/^\s+repo:\s*["']?([^"'\n]+)["']?/m)?.[1]?.trim();
  return owner && repo ? { owner, repo } : null;
}
export function updateScalar(fm: string, key: string, value: string) {
  const line = `${key}: ${JSON.stringify(value)}`;
  const exp = new RegExp(`^${key}:.*$`, "m");
  return exp.test(fm) ? fm.replace(exp, line) : `${fm}\n${line}`;
}
