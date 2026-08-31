// ==========================================================================
// dsh-client-ui-skin-kitty — Host 插件半（静态插件，ES module）
// --------------------------------------------------------------------------
// 静态插件与动态插件的区别：
//   - 动态插件用 `return { apply(ctx) {...} }` + `harness.handle`/`host.call`。
//   - 静态插件用 `export function apply(ctx)`，Client↔Host 通信走 HTTP 路由。
// 本 Host 半通过 DSH 的 webServer 服务注册 HTTP 路由，Client 用 fetch() 调用：
//   /ws-api/tree?cwd=...        JSON：工作区文件树
//   /ws-api/read?path=...&cwd=  JSON：文本文件内容
//   /ws-api/stats?sessionId=... JSON：当前会话 token 用量
//   /ws-file?path=...&cwd=...   二进制：图片/PDF（按 MIME 提供）
//   /kitty/theme.css            CSS：Kitty 主题（壁纸指向 /kitty/wallpaper.jpg）
//   /kitty/wallpaper.jpg        二进制：凯蒂猫壁纸原图
// ==========================================================================

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function mimeFromName(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const map = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", pdf: "application/pdf",
    txt: "text/plain", md: "text/plain", js: "text/plain", css: "text/plain", json: "text/plain"
  };
  return map[ext] || "application/octet-stream";
}

function parseQuery(url) {
  const q = (url || "").split("?")[1] || "";
  const params = {};
  q.split("&").forEach((kv) => {
    const p = kv.split("=");
    if (p.length === 2) params[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
  });
  return params;
}

function sendJson(res, data) {
  const body = JSON.stringify(data);
  res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}

export function apply(ctx) {
  const fs = ctx.get("fs");
  if (fs === undefined) return;

  const baseline = new Map();   // path -> version 字符串
  const changedAt = new Map();  // path -> 改动时间戳

  function pickRoot(cwd) {
    if (typeof cwd === "string" && cwd.length > 0) return cwd;
    const sp = ctx.get("sandboxPolicy");
    return sp !== undefined ? sp.workspaceRoot : "";
  }

  async function buildTree(path, depth) {
    let target;
    try { target = await fs.resolve(path); } catch { return []; }
    let entries;
    try { entries = await fs.listDir(target); } catch { return []; }
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
    });
    const children = [];
    for (const e of entries) {
      const childPath = e.target.displayPath;
      if (e.type === "directory") {
        if (e.name === ".git" || e.name === "node_modules") continue;
        const kids = depth < 5 ? await buildTree(childPath, depth + 1) : [];
        children.push({ name: e.name, path: childPath, type: "dir", children: kids });
      } else {
        const ver = e.version !== undefined ? String(e.version) : "";
        if (ver !== "") {
          const prev = baseline.get(childPath);
          if (prev !== undefined && prev !== ver) changedAt.set(childPath, Date.now());
          baseline.set(childPath, ver);
        }
        const changed = changedAt.has(childPath) && (Date.now() - changedAt.get(childPath)) < 25000;
        children.push({ name: e.name, path: childPath, type: "file", size: e.size || 0, changed });
      }
    }
    return children;
  }

  const webServer = ctx.get("webServer");
  if (webServer === undefined) return;

  // JSON API（tree / read / stats）
  ctx.effect(() => webServer.register({
    kind: "prefix",
    path: "/ws-api",
    handler: async (req, res) => {
      const [pathname, query] = (req.url || "").split("?");
      const params = parseQuery("?" + query);
      try {
        if (pathname === "/ws-api/tree") {
          const root = pickRoot(params.cwd);
          if (!root) return sendJson(res, { root: "", tree: [], error: "no workspace" });
          const tree = await buildTree(root, 0);
          const parts = root.split(/[\\/]/).filter((s) => s.length > 0);
          return sendJson(res, { root: parts.length > 0 ? parts[parts.length - 1] : "workspace", tree });
        }
        if (pathname === "/ws-api/read") {
          const root = pickRoot(params.cwd);
          if (typeof params.path !== "string" || !root) return sendJson(res, { error: "invalid" });
          const t = await fs.resolve(params.path, { cwd: root });
          const info = await fs.stat(t);
          if (info === undefined || info.type !== "file") return sendJson(res, { error: "不是文本文件" });
          const text = await fs.readText(t);
          const max = 60000;
          return sendJson(res, { content: text.slice(0, max), truncated: text.length > max, size: text.length });
        }
        if (pathname === "/ws-api/stats") {
          const sessions = ctx.get("sessions");
          const tokenMeter = ctx.get("tokenMeter");
          const sid = params.sessionId;
          if (sessions === undefined || tokenMeter === undefined || typeof sid !== "string") return sendJson(res, { error: "unavailable" });
          const session = sessions.get(sid);
          if (session === undefined) return sendJson(res, { error: "no session" });
          const m = tokenMeter.measure(session);
          return sendJson(res, { total: m.surfaceTokens, rev: m.logRevision });
        }
        res.writeHead(404); res.end("not found");
      } catch (e) {
        sendJson(res, { error: String((e && e.message) || e) });
      }
    }
  }));

  // 二进制文件（图片/PDF 预览）
  ctx.effect(() => webServer.register({
    kind: "prefix",
    path: "/ws-file",
    handler: async (req, res) => {
      const params = parseQuery(req.url || "");
      const { path, cwd } = params;
      try {
        if (!path) { res.writeHead(400); res.end("bad path"); return; }
        const target = await fs.resolve(path, cwd ? { cwd } : {});
        const info = await fs.stat(target);
        if (info === undefined || info.type !== "file") { res.writeHead(404); res.end("not found"); return; }
        const bytes = await fs.readBytes(target, undefined, 20000000);
        res.writeHead(200, {
          "content-type": mimeFromName(path),
          "content-length": String(bytes.length),
          "cache-control": "no-store"
        });
        res.end(bytes);
      } catch (e) {
        try { res.writeHead(500); res.end(String(e)); } catch {}
      }
    }
  }));

  // Kitty 主题 CSS：Client 半在启动时以 <link rel="stylesheet"> 注入。
  // 壁纸走 /kitty/wallpaper.jpg（绝对路径），不依赖 CSS 的解析基址。
  ctx.effect(() => webServer.register({
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
  }));

  // Kitty 壁纸原图（theme.css 中的 url("/kitty/wallpaper.jpg")）
  ctx.effect(() => webServer.register({
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
  }));
}
