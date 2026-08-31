// ==========================================================================
// dsh-client-ui-skin-kitty — Host 插件半（静态插件，ES module，纯主题）
// --------------------------------------------------------------------------
// 只提供 Kitty 主题所需的两个静态资源路由，由 Client 半以
// <link rel="stylesheet" href="/kitty/theme.css"> 注入：
//
//   /kitty/theme.css      CSS：Hello Kitty 主题（壁纸指向 /kitty/wallpaper.jpg）
//   /kitty/wallpaper.jpg  二进制：凯蒂猫壁纸原图
//
// 注：webServer 必须用显式 ctx.inject(["webServer"], ...) 获取（与
// dsh-desktop-market-installer 相同的模式）；直接用 ctx.get("webServer")/
// ctx.get("fs") 在 profile 根 context 里拿不到服务，会导致插件静默失效。
// ==========================================================================

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function apply(ctx) {
  // Kitty 主题 CSS
  ctx.inject(["webServer"], (webCtx) => webCtx.effect(
    () => webCtx.webServer.register({
      kind: "exact",
      path: "/kitty/theme.css",
      handler: async (req, res) => {
        try {
          const css = await readFile(join(PACKAGE_ROOT, "theme.css"), "utf8");
          res.writeHead(200, {
            "content-type": "text/css; charset=utf-8",
            "cache-control": "no-store"
          });
          res.end(css);
        } catch (e) {
          try { res.writeHead(500); res.end(String(e)); } catch {}
        }
      }
    }),
    "dsh-client-ui-skin-kitty: theme css route"
  ));

  // Kitty 壁纸原图（theme.css 中的 url("/kitty/wallpaper.jpg")）
  ctx.inject(["webServer"], (webCtx) => webCtx.effect(
    () => webCtx.webServer.register({
      kind: "exact",
      path: "/kitty/wallpaper.jpg",
      handler: async (req, res) => {
        try {
          const bytes = await readFile(join(PACKAGE_ROOT, "assets", "kitty-wallpaper.jpg"));
          res.writeHead(200, {
            "content-type": "image/jpeg",
            "content-length": String(bytes.length),
            "cache-control": "no-store"
          });
          res.end(bytes);
        } catch (e) {
          try { res.writeHead(500); res.end(String(e)); } catch {}
        }
      }
    }),
    "dsh-client-ui-skin-kitty: wallpaper route"
  ));
}
