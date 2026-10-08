import { readdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";

const distDirectory = path.resolve("dist");
const publicPrefix = "/anquanxiaofang/";
const publicDirectories = ["brand", "demo-media", "design-assets", "ui-backgrounds"];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(entryPath));
    else files.push(entryPath);
  }
  return files;
}

const pathPattern = new RegExp(`(["'\\x60(])/(?:${publicDirectories.join("|")})/`, "g");
const files = await collectFiles(distDirectory);
for (const filePath of files) {
  const extension = path.extname(filePath).toLowerCase();
  if (![".html", ".js", ".css", ".json"].includes(extension)) continue;
  const source = await readFile(filePath, "utf8");
  const rewritten = source.replace(pathPattern, `$1${publicPrefix}`);
  if (rewritten !== source) await writeFile(filePath, rewritten, "utf8");
}

await copyFile(path.join(distDirectory, "index.html"), path.join(distDirectory, "404.html"));
console.log(`GitHub Pages prepared: ${files.length} files scanned, SPA fallback written to dist/404.html`);
