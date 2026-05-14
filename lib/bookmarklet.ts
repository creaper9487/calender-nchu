import fs from "node:fs";
import path from "node:path";

let cached: string | null = null;

export function getBookmarkletSource(): string {
  if (cached) return cached;

  const filePath = path.join(process.cwd(), "stuff");
  const raw = fs.readFileSync(filePath, "utf8");

  const stripped = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\/\/.*$/, ""))
    .join("\n");

  const compact = stripped.replace(/\s+/g, " ").trim();

  cached = compact.startsWith("javascript:")
    ? compact
    : `javascript:${compact}`;
  return cached;
}
