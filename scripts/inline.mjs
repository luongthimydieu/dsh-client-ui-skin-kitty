// 生成 theme.inline.css：把 theme.css 中壁纸的相对路径替换为 base64 data URI。
// 用法：npm run inline  （需要 Node.js 18+）
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cssPath = join(root, "theme.css");
const imgPath = join(root, "assets", "kitty-wallpaper.jpg");
const outPath = join(root, "theme.inline.css");

const css = readFileSync(cssPath, "utf8");
const img = readFileSync(imgPath);
const b64 = img.toString("base64");
const dataUri = `url("data:image/jpeg;base64,${b64}")`;

const inline = css.replaceAll('url("./assets/kitty-wallpaper.jpg")', dataUri);
writeFileSync(outPath, inline, "utf8");
console.log(`wrote ${outPath} (${Buffer.byteLength(inline)} bytes)`);
