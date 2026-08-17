// ==========================================================================
// dsh-client-ui-skin-kitty — Host 插件半（文件面板 / 预览 / 用量统计）
// --------------------------------------------------------------------------
// 本文件是 DSH 动态插件的 Host 半「插件体」：即 `return { apply(ctx) {...} }`。
// 用法：
//   1) 动态插件：把本文件内容作为 cordis_define 的 code.host 传入。
//   2) 静态插件：把 `return { apply(ctx) {...} }` 改写为 `export function apply(ctx) {...}`
//      （ES module），并配合 DSH 的插件打包规范（见 README）。
//
// 提供的 Client→Host RPC：
//   ws/tree       列出工作区文件树（含改动标记）
//   ws/read       读取文本文件内容（预览）
//   ws/stats      读取当前会话的 token 用量
// HTTP 路由：
//   /ws-file      以正确 MIME 提供工作区文件（用于图片/PDF 预览）
// ==========================================================================

function mimeFromName(name) {
  var ext = (name.split(".").pop() || "").toLowerCase();
  var map = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", pdf: "application/pdf",
    txt: "text/plain", md: "text/plain", js: "text/plain", css: "text/plain", json: "text/plain"
  };
  return map[ext] || "application/octet-stream";
}

return {
  apply: function (ctx) {
    var fs = ctx.get("fs");
    if (fs === undefined) return;

    // 用于检测「某轮对话是否改动了文件」：比较两次采样间文件的版本号。
    var baseline = new Map();   // path -> version 字符串
    var changedAt = new Map();  // path -> 改动时间戳

    function pickRoot(args) {
      if (args && typeof args.cwd === "string" && args.cwd.length > 0) return args.cwd;
      var sp = ctx.get("sandboxPolicy");
      return sp !== undefined ? sp.workspaceRoot : "";
    }

    async function buildTree(path, depth) {
      var target;
      try { target = await fs.resolve(path); } catch (e) { return []; }
      var entries;
      try { entries = await fs.listDir(target); } catch (e) { return []; }
      entries.sort(function (a, b) {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
      });
      var children = [];
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var childPath = e.target.displayPath;
        if (e.type === "directory") {
          if (e.name === ".git" || e.name === "node_modules") continue;
          var kids = depth < 5 ? await buildTree(childPath, depth + 1) : [];
          children.push({ name: e.name, path: childPath, type: "dir", children: kids });
        } else {
          var ver = e.version !== undefined ? String(e.version) : "";
          if (ver !== "") {
            var prev = baseline.get(childPath);
            if (prev !== undefined && prev !== ver) changedAt.set(childPath, Date.now());
            baseline.set(childPath, ver);
          }
          var changed = changedAt.has(childPath) && (Date.now() - changedAt.get(childPath)) < 25000;
          children.push({ name: e.name, path: childPath, type: "file", size: e.size || 0, changed: changed });
        }
      }
      return children;
    }

    harness.handle("ws/tree", async function (args) {
      var root = pickRoot(args);
      if (!root) return { root: "", tree: [], error: "no workspace" };
      var tree = await buildTree(root, 0);
      var parts = root.split(/[\\/]/).filter(function (s) { return s.length > 0; });
      return { root: parts.length > 0 ? parts[parts.length - 1] : "workspace", tree: tree };
    });

    harness.handle("ws/read", async function (args) {
      var path = args && args.path;
      var root = pickRoot(args);
      if (typeof path !== "string" || !root) return { error: "invalid" };
      try {
        var t = await fs.resolve(path, { cwd: root });
        var info = await fs.stat(t);
        if (info === undefined || info.type !== "file") return { error: "不是文本文件" };
        var text = await fs.readText(t);
        var max = 60000;
        return { content: text.slice(0, max), truncated: text.length > max, size: text.length };
      } catch (err) { return { error: String((err && err.message) || err) }; }
    });

    harness.handle("ws/stats", function (args) {
      var sid = args && args.sessionId;
      var sessions = ctx.get("sessions");
      var tokenMeter = ctx.get("tokenMeter");
      if (sessions === undefined || tokenMeter === undefined || typeof sid !== "string") return { error: "unavailable" };
      var session = sessions.get(sid);
      if (session === undefined) return { error: "no session" };
      try {
        var m = tokenMeter.measure(session);
        return { total: m.surfaceTokens, rev: m.logRevision };
      } catch (e) { return { error: String((e && e.message) || e) }; }
    });

    var webServer = ctx.get("webServer");
    if (webServer !== undefined) {
      ctx.effect(function () {
        return webServer.register({
          kind: "prefix",
          path: "/ws-file",
          handler: async function (req, res) {
            try {
              var q = (req.url || "").split("?")[1] || "";
              var params = {};
              q.split("&").forEach(function (kv) {
                var p = kv.split("=");
                if (p.length === 2) params[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
              });
              var path = params.path;
              var cwd = params.cwd;
              if (!path) { res.writeHead(400); res.end("bad path"); return; }
              var target = await fs.resolve(path, cwd ? { cwd: cwd } : {});
              var info = await fs.stat(target);
              if (info === undefined || info.type !== "file") { res.writeHead(404); res.end("not found"); return; }
              var bytes = await fs.readBytes(target, undefined, 20000000);
              res.writeHead(200, {
                "content-type": mimeFromName(path),
                "content-length": String(bytes.length),
                "cache-control": "no-store"
              });
              res.end(bytes);
            } catch (e) {
              try { res.writeHead(500); res.end(String(e)); } catch (e2) {}
            }
          }
        });
      });
    }
  }
};
