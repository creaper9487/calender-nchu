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

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  const withUrl = compact.replaceAll("http://localhost:3000", appUrl);

  cached = withUrl.startsWith("javascript:")
    ? withUrl
    : `javascript:${withUrl}`;
  return cached;
}
