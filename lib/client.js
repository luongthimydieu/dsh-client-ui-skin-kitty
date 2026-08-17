// ==========================================================================
// dsh-client-ui-skin-kitty — Client 插件半（静态插件，ModuleLoader 格式）
// --------------------------------------------------------------------------
// 静态插件的客户端使用 window.__ModuleLoader__.load 加载。
// 与动态插件的区别：数据通信用浏览器 fetch() 调 Host 的 /ws-api/* 路由，
// 而不是 host.call()。React 通过 require("react") 引入。
// ==========================================================================

window.__ModuleLoader__.load({
  id: "dsh-client-ui-skin-kitty",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require("react");

    // 探针：在会话头部读取当前会话的 sessionId 与工作区 cwd
    function CwdProbe(props) {
      const setCwd = props.setCwd, setSessionId = props.setSessionId;
      const sessionId = props.sessionId;
      const useSessions = props.useSessions;
      const current = useSessions ? useSessions((s) => s.current) : undefined;
      const byId = useSessions ? useSessions((s) => s.byId) : undefined;
      React.useEffect(() => {
        if (sessionId) setSessionId(sessionId);
        if (byId && current) { const sm = byId[current]; if (sm && sm.cwd) setCwd(sm.cwd); }
      }, [sessionId, current, byId]);
      return React.createElement("span", { style: { display: "none" } });
    }

    function TreeNode(props) {
      const node = props.node, onOpen = props.onOpen, depth = props.depth || 0;
      const [open, setOpen] = React.useState(false);
      const pad = (depth * 14) + 8;
      if (node.type === "dir") {
        return React.createElement("div", null,
          React.createElement("div", { style: { padding: "3px 6px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, paddingLeft: pad, borderRadius: 4 }, onClick: () => setOpen(!open) },
            React.createElement("span", { style: { width: 12 } }, open ? "▾" : "▸"),
            React.createElement("span", null, "📁 " + node.name)),
          open ? React.createElement("div", null, (node.children || []).map((c) => React.createElement(TreeNode, { key: c.path || c.name, node: c, onOpen, depth: depth + 1 }))) : null);
      }
      return React.createElement("div", { style: { padding: "3px 6px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, paddingLeft: pad, background: node.changed ? "rgba(231,84,128,0.18)" : "transparent", borderRadius: 4 }, onClick: () => onOpen(node.path) },
        React.createElement("span", { style: { width: 12 } }, ""),
        React.createElement("span", null, "📄 " + node.name),
        node.changed ? React.createElement("span", { style: { color: "#e75480", fontSize: 11, fontWeight: 600 } }, "● 已改") : null);
    }

    function PreviewModal(props) {
      const pv = props.pv, onClose = props.onClose;
      if (!pv) return null;
      let body = null;
      if (pv.type === "loading") body = React.createElement("div", { style: { padding: 24, color: "#999" } }, "加载中…");
      else if (pv.type === "error") body = React.createElement("div", { style: { padding: 24, color: "#c33" } }, pv.msg);
      else if (pv.type === "text") body = React.createElement("pre", { style: { flex: 1, overflow: "auto", margin: 0, padding: 16, fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" } }, pv.content + (pv.truncated ? "\n\n…（内容已截断）" : ""));
      else if (pv.type === "image") body = React.createElement("div", { style: { flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 } }, React.createElement("img", { src: pv.url, style: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" } }));
      else if (pv.type === "pdf") body = React.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column" } },
        React.createElement("div", { style: { padding: 8, fontSize: 12 } }, React.createElement("a", { href: pv.url, target: "_blank", rel: "noopener", style: { color: "#e75480" } }, "在新标签页打开 PDF")),
        React.createElement("iframe", { src: pv.url, style: { flex: 1, width: "100%", border: "none" } }));
      return React.createElement("div", { style: { position: "fixed", top: "5%", bottom: "5%", left: "5%", right: 340, background: "var(--dsw-alias-bg-overlay, #fff)", borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.25)", zIndex: 80, display: "flex", flexDirection: "column", overflow: "hidden", color: "var(--dsw-alias-label-primary, #333)" } },
        React.createElement("div", { style: { padding: "10px 14px", borderBottom: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.1))", display: "flex", alignItems: "center", gap: 10 } },
          React.createElement("span", { style: { flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, pv.path || ""),
          React.createElement("button", { onClick: onClose, style: { border: "none", background: "transparent", cursor: "pointer", fontSize: 18 } }, "✕")),
        body);
    }

    function WorkspacePanel(props) {
      const ctx = props.ctx, getCwd = props.getCwd;
      const [tree, setTree] = React.useState([]);
      const [root, setRoot] = React.useState("workspace");
      const [pv, setPv] = React.useState(null);

      function refresh() {
        const cwd = getCwd();
        fetch("/ws-api/tree?cwd=" + encodeURIComponent(cwd || ""))
          .then((r) => r.json())
          .then((res) => { if (res) { setTree(res.tree || []); setRoot(res.root || "workspace"); } })
          .catch(() => {});
      }
      function fileUrl(path) { return "/ws-file?path=" + encodeURIComponent(path) + "&cwd=" + encodeURIComponent(getCwd() || ""); }
      function openFile(path) {
        const ext = (path.split(".").pop() || "").toLowerCase();
        const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
        const isPdf = ext === "pdf";
        if (isImage) { setPv({ type: "image", path, url: fileUrl(path) }); return; }
        if (isPdf) { setPv({ type: "pdf", path, url: fileUrl(path) }); return; }
        setPv({ type: "loading", path });
        fetch("/ws-api/read?path=" + encodeURIComponent(path) + "&cwd=" + encodeURIComponent(getCwd() || ""))
          .then((r) => r.json())
          .then((res) => {
            if (!res) { setPv({ type: "error", path, msg: "读取失败" }); return; }
            if (res.content !== null && res.content !== undefined) setPv({ type: "text", path, content: res.content, truncated: res.truncated });
            else setPv({ type: "error", path, msg: res.error || "无法预览" });
          })
          .catch(() => setPv({ type: "error", path, msg: "读取失败" }));
      }

      React.useEffect(() => { refresh(); return ctx.interval(refresh, 2000); }, []);

      return React.createElement("div", null,
        React.createElement("div", { style: { position: "fixed", top: 0, right: 0, bottom: 0, width: 320, background: "var(--dsw-alias-bg-overlay, rgba(255,255,255,0.96))", borderLeft: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.1))", display: "flex", flexDirection: "column", zIndex: 60, boxShadow: "-4px 0 16px rgba(0,0,0,0.08)", color: "var(--dsw-alias-label-primary, #333)" } },
          React.createElement("div", { style: { padding: "10px 12px", borderBottom: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.08))", display: "flex", alignItems: "center", gap: 8 } },
            React.createElement("span", { style: { fontWeight: 600, flex: 1, fontSize: 14 } }, "工作区文件 · " + root),
            React.createElement("button", { onClick: refresh, style: { border: "none", background: "transparent", cursor: "pointer", fontSize: 14 } }, "⟳")),
          React.createElement("div", { style: { flex: 1, overflow: "auto", padding: 8, fontSize: 13 } },
            tree.length === 0 ? React.createElement("div", { style: { color: "#999", padding: 16, textAlign: "center" } }, "加载中…") : tree.map((n) => React.createElement(TreeNode, { key: n.path || n.name, node: n, onOpen: openFile })))),
        React.createElement(PreviewModal, { pv, onClose: () => setPv(null) }));
    }

    function BarChart(props) {
      const deltas = props.deltas, h = 48, STEP = 8, MAX = 30;
      if (!deltas || deltas.length < 1) return React.createElement("div", { style: { height: h, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 10 } }, "采样中（每1分钟一柱）…");
      let max = 1;
      for (const d of deltas) if (d > max) max = d;
      const recent = deltas.length > MAX ? deltas.slice(deltas.length - MAX) : deltas;
      const offset = MAX - recent.length, w = MAX * STEP;
      const rects = [];
      for (let j = 0; j < MAX; j++) {
        const d = j >= offset ? recent[j - offset] : 0;
        const bh = d > 0 ? Math.max((d / max) * (h - 4), 2) : 0;
        rects.push(React.createElement("rect", { key: j, x: j * STEP + 1, y: h - bh - 2, width: STEP - 2, height: bh, rx: 1.5, fill: "#e75480" }));
      }
      return React.createElement("svg", { viewBox: "0 0 " + w + " " + h, width: "100%", height: h, preserveAspectRatio: "none", style: { display: "block" } }, rects);
    }

    function UsageChart(props) {
      const ctx = props.ctx, getSessionId = props.getSessionId;
      const [pts, setPts] = React.useState([]);
      const [tot, setTot] = React.useState(0);

      React.useEffect(() => {
        let last = 0, curSid = null;
        function poll() {
          const sid = getSessionId();
          if (!sid) return;
          if (sid !== curSid) { curSid = sid; last = 0; setPts([]); setTot(0); }
          fetch("/ws-api/stats?sessionId=" + encodeURIComponent(sid))
            .then((r) => r.json())
            .then((res) => {
              if (res && res.total !== undefined) {
                setTot(res.total);
                const now = Date.now();
                if (now - last >= 60000) {
                  last = now;
                  setPts((prev) => { const nx = prev.concat([{ t: now, v: res.total }]); return nx.length > 180 ? nx.slice(nx.length - 180) : nx; });
                }
              }
            })
            .catch(() => {});
        }
        poll();
        return ctx.interval(poll, 10000);
      }, []);

      const deltas = [];
      for (let i = 1; i < pts.length; i++) deltas.push(Math.max(0, pts[i].v - pts[i - 1].v));

      return React.createElement("div", { style: { position: "fixed", left: 0, bottom: 112, width: 272, zIndex: 55, padding: "8px 10px", fontSize: 11, color: "var(--dsw-alias-label-secondary, #666)", background: "var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-2, #fff0f5))", borderTop: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.08))", borderRight: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.08))", borderTopRightRadius: 10 } },
        React.createElement("div", { style: { marginBottom: 6, fontWeight: 600, fontSize: 12, color: "var(--dsw-alias-label-primary, #333)" } }, "本对话 tokens：" + tot),
        React.createElement(BarChart, { deltas }));
    }

    function apply(ctx) {
      const shared = { cwd: null, sessionId: null };

      // 中间主体左移，给右侧面板让位
      if (typeof document !== "undefined") {
        const tag = document.createElement("style");
        tag.dataset.plugin = "dsh-client-ui-skin-kitty";
        tag.textContent = ".pI_x6G_centerCol{margin-right:320px;}";
        document.head.appendChild(tag);
      }

      ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register(
        { name: "conversation.session.header.actions", id: "ws-cwd-probe", order: 99 },
        (p) => React.createElement(CwdProbe, { useSessions: p.useSessions, sessionId: p.sessionId, setCwd: (c) => { shared.cwd = c; }, setSessionId: (s) => { shared.sessionId = s; } })
      ));

      ctx.slots.inject("shell.overlay", () => ctx.slots.register(
        { name: "shell.overlay", id: "workspace-files", order: 0 },
        () => React.createElement(WorkspacePanel, { ctx, getCwd: () => shared.cwd })
      ));

      ctx.slots.inject("shell.overlay", () => ctx.slots.register(
        { name: "shell.overlay", id: "api-usage", order: 1 },
        () => React.createElement(UsageChart, { ctx, getSessionId: () => shared.sessionId })
      ));
    }

    exports.apply = apply;
    exports.inject = ["slots", "timer"];
    return module.exports;
  }
});
