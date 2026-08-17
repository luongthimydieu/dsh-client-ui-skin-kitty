// ==========================================================================
// dsh-client-ui-skin-kitty — Client 插件半（文件面板 / 预览 / 用量柱状图）
// --------------------------------------------------------------------------
// 本文件是 DSH 动态插件的 Client 半「插件体」：即 `return { apply(ctx) {...} }`。
// 用法：
//   1) 动态插件：把本文件内容作为 cordis_define 的 code.client 传入。
//   2) 静态插件：把 `return { apply(ctx) {...} }` 改写为 DSH 客户端模块格式
//      （window.__ModuleLoader__.load(...)），见 README。
//
// UI：
//   右侧「工作区文件」面板（shell.overlay）—— 文件树 + 预览弹窗
//   左侧「本对话 tokens」柱状图（shell.overlay）—— 每 1 分钟一根柱子
// 依赖 Host 半提供的 ws/tree、ws/read、ws/stats 与 /ws-file 路由。
// ==========================================================================

// 探针：在会话头部（session 作用域）读取当前会话的 sessionId 与工作区 cwd，
// 存进插件共享状态，供 root 作用域的面板/图表使用。
function CwdProbe(props) {
  var setCwd = props.setCwd;
  var setSessionId = props.setSessionId;
  var sessionId = props.sessionId;
  var useSessions = props.useSessions;
  var current = useSessions ? useSessions(function (s) { return s.current; }) : undefined;
  var byId = useSessions ? useSessions(function (s) { return s.byId; }) : undefined;
  React.useEffect(function () {
    if (sessionId) setSessionId(sessionId);
    if (byId && current) { var sm = byId[current]; if (sm && sm.cwd) setCwd(sm.cwd); }
  }, [sessionId, current, byId]);
  return React.createElement("span", { style: { display: "none" } });
}

// 文件树节点（文件夹可展开/收起，文件点击预览）
function TreeNode(props) {
  var node = props.node;
  var onOpen = props.onOpen;
  var depth = props.depth || 0;
  var _o = React.useState(false);
  var open = _o[0];
  var setOpen = _o[1];
  var pad = (depth * 14) + 8;
  if (node.type === "dir") {
    return React.createElement("div", null,
      React.createElement("div", {
        style: { padding: "3px 6px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, paddingLeft: pad, borderRadius: 4 },
        onClick: function () { setOpen(!open); }
      },
        React.createElement("span", { style: { width: 12 } }, open ? "▾" : "▸"),
        React.createElement("span", null, "📁 " + node.name)
      ),
      open ? React.createElement("div", null, (node.children || []).map(function (c) {
        return React.createElement(TreeNode, { key: c.path || c.name, node: c, onOpen: onOpen, depth: depth + 1 });
      })) : null
    );
  }
  return React.createElement("div", {
    style: { padding: "3px 6px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, paddingLeft: pad, background: node.changed ? "rgba(231,84,128,0.18)" : "transparent", borderRadius: 4 },
    onClick: function () { onOpen(node.path); }
  },
    React.createElement("span", { style: { width: 12 } }, ""),
    React.createElement("span", null, "📄 " + node.name),
    node.changed ? React.createElement("span", { style: { color: "#e75480", fontSize: 11, fontWeight: 600 } }, "● 已改") : null
  );
}

// 独立预览弹窗（文本 / 图片 / PDF，可关闭）
function PreviewModal(props) {
  var pv = props.pv;
  var onClose = props.onClose;
  if (!pv) return null;
  var body = null;
  if (pv.type === "loading") body = React.createElement("div", { style: { padding: 24, color: "#999" } }, "加载中…");
  else if (pv.type === "error") body = React.createElement("div", { style: { padding: 24, color: "#c33" } }, pv.msg);
  else if (pv.type === "text") body = React.createElement("pre", { style: { flex: 1, overflow: "auto", margin: 0, padding: 16, fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" } }, pv.content + (pv.truncated ? "\n\n…（内容已截断）" : ""));
  else if (pv.type === "image") body = React.createElement("div", { style: { flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 } }, React.createElement("img", { src: pv.url, style: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" } }));
  else if (pv.type === "pdf") body = React.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column" } },
    React.createElement("div", { style: { padding: 8, fontSize: 12 } }, React.createElement("a", { href: pv.url, target: "_blank", rel: "noopener", style: { color: "#e75480" } }, "在新标签页打开 PDF")),
    React.createElement("iframe", { src: pv.url, style: { flex: 1, width: "100%", border: "none" } })
  );
  return React.createElement("div", {
    style: { position: "fixed", top: "5%", bottom: "5%", left: "5%", right: 340, background: "var(--dsw-alias-bg-overlay, #fff)", borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.25)", zIndex: 80, display: "flex", flexDirection: "column", overflow: "hidden", color: "var(--dsw-alias-label-primary, #333)" }
  },
    React.createElement("div", { style: { padding: "10px 14px", borderBottom: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.1))", display: "flex", alignItems: "center", gap: 10 } },
      React.createElement("span", { style: { flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, pv.path || ""),
      React.createElement("button", { onClick: onClose, style: { border: "none", background: "transparent", cursor: "pointer", fontSize: 18 } }, "✕")
    ),
    body
  );
}

// 右侧「工作区文件」面板
function WorkspacePanel(props) {
  var ctx = props.ctx;
  var getCwd = props.getCwd;
  var _tree = React.useState([]); var tree = _tree[0]; var setTree = _tree[1];
  var _root = React.useState("workspace"); var root = _root[0]; var setRoot = _root[1];
  var _pv = React.useState(null); var pv = _pv[0]; var setPv = _pv[1];

  function refresh() {
    var cwd = getCwd();
    host.call("ws/tree", { cwd: cwd }).then(function (res) {
      if (res) { setTree(res.tree || []); setRoot(res.root || "workspace"); }
    }).catch(function () {});
  }
  function fileUrl(path) { return "/ws-file?path=" + encodeURIComponent(path) + "&cwd=" + encodeURIComponent(getCwd() || ""); }
  function openFile(path) {
    var ext = (path.split(".").pop() || "").toLowerCase();
    var isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].indexOf(ext) >= 0;
    var isPdf = ext === "pdf";
    if (isImage) { setPv({ type: "image", path: path, url: fileUrl(path) }); return; }
    if (isPdf) { setPv({ type: "pdf", path: path, url: fileUrl(path) }); return; }
    setPv({ type: "loading", path: path });
    host.call("ws/read", { path: path, cwd: getCwd() }).then(function (res) {
      if (!res) { setPv({ type: "error", path: path, msg: "读取失败" }); return; }
      if (res.content !== null && res.content !== undefined) setPv({ type: "text", path: path, content: res.content, truncated: res.truncated });
      else setPv({ type: "error", path: path, msg: res.error || "无法预览" });
    }).catch(function () { setPv({ type: "error", path: path, msg: "读取失败" }); });
  }

  React.useEffect(function () { refresh(); return ctx.interval(refresh, 2000); }, []);

  return React.createElement("div", null,
    React.createElement("div", {
      style: { position: "fixed", top: 0, right: 0, bottom: 0, width: 320, background: "var(--dsw-alias-bg-overlay, rgba(255,255,255,0.96))", borderLeft: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.1))", display: "flex", flexDirection: "column", zIndex: 60, boxShadow: "-4px 0 16px rgba(0,0,0,0.08)", color: "var(--dsw-alias-label-primary, #333)" }
    },
      React.createElement("div", { style: { padding: "10px 12px", borderBottom: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.08))", display: "flex", alignItems: "center", gap: 8 } },
        React.createElement("span", { style: { fontWeight: 600, flex: 1, fontSize: 14 } }, "工作区文件 · " + root),
        React.createElement("button", { onClick: refresh, style: { border: "none", background: "transparent", cursor: "pointer", fontSize: 14 } }, "⟳")
      ),
      React.createElement("div", { style: { flex: 1, overflow: "auto", padding: 8, fontSize: 13 } },
        tree.length === 0
          ? React.createElement("div", { style: { color: "#999", padding: 16, textAlign: "center" } }, "加载中…")
          : tree.map(function (n) { return React.createElement(TreeNode, { key: n.path || n.name, node: n, onOpen: openFile }); })
      )
    ),
    React.createElement(PreviewModal, { pv: pv, onClose: function () { setPv(null); } })
  );
}

// 柱状图：固定宽度 + 滑动时间轴（只显示最近 30 根 = 最近 30 分钟）
function BarChart(props) {
  var deltas = props.deltas;
  var h = 48;
  var STEP = 8;   // 每根柱子固定占 8px（柱 6px + 间隙 2px）
  var MAX = 30;   // 滑动窗口：最多 30 根
  if (!deltas || deltas.length < 1) return React.createElement("div", { style: { height: h, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 10 } }, "采样中（每1分钟一柱）…");
  var max = 1;
  for (var i = 0; i < deltas.length; i++) if (deltas[i] > max) max = deltas[i];
  var recent = deltas.length > MAX ? deltas.slice(deltas.length - MAX) : deltas;
  var offset = MAX - recent.length;
  var w = MAX * STEP;
  var rects = [];
  for (var j = 0; j < MAX; j++) {
    var d = j >= offset ? recent[j - offset] : 0;
    var bh = d > 0 ? Math.max((d / max) * (h - 4), 2) : 0;
    rects.push(React.createElement("rect", { key: j, x: j * STEP + 1, y: h - bh - 2, width: STEP - 2, height: bh, rx: 1.5, fill: "#e75480" }));
  }
  return React.createElement("svg", { viewBox: "0 0 " + w + " " + h, width: "100%", height: h, preserveAspectRatio: "none", style: { display: "block" } }, rects);
}

// 左侧「本对话 tokens」用量图
function UsageChart(props) {
  var ctx = props.ctx;
  var getSessionId = props.getSessionId;
  var _pts = React.useState([]); var pts = _pts[0]; var setPts = _pts[1];
  var _tot = React.useState(0); var tot = _tot[0]; var setTot = _tot[1];

  React.useEffect(function () {
    var last = 0;
    var curSid = null;
    function poll() {
      var sid = getSessionId();
      if (!sid) return;
      if (sid !== curSid) {  // 切换对话 → 重置
        curSid = sid;
        last = 0;
        setPts([]);
        setTot(0);
      }
      host.call("ws/stats", { sessionId: sid }).then(function (res) {
        if (res && res.total !== undefined) {
          setTot(res.total);
          var now = Date.now();
          if (now - last >= 60000) {  // 每 1 分钟采集一个点
            last = now;
            setPts(function (prev) {
              var nx = prev.concat([{ t: now, v: res.total }]);
              if (nx.length > 180) nx = nx.slice(nx.length - 180);
              return nx;
            });
          }
        }
      }).catch(function () {});
    }
    poll();
    var dis = ctx.interval(poll, 10000);  // 每 10 秒刷新总数 + 检测切对话
    return dis;
  }, []);

  var deltas = [];
  for (var i = 1; i < pts.length; i++) deltas.push(Math.max(0, pts[i].v - pts[i - 1].v));

  return React.createElement("div", {
    style: { position: "fixed", left: 0, bottom: 112, width: 272, zIndex: 55, padding: "8px 10px", fontSize: 11, color: "var(--dsw-alias-label-secondary, #666)", background: "var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-2, #fff0f5))", borderTop: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.08))", borderRight: "1px solid var(--dsw-alias-border-l2, rgba(0,0,0,0.08))", borderTopRightRadius: 10 }
  },
    React.createElement("div", { style: { marginBottom: 6, fontWeight: 600, fontSize: 12, color: "var(--dsw-alias-label-primary, #333)" } }, "本对话 tokens：" + tot),
    React.createElement(BarChart, { deltas: deltas })
  );
}

return {
  inject: ["slots", "timer"],
  apply: function (ctx) {
    var shared = { cwd: null, sessionId: null };

    // 中间主体内容左移，给右侧面板让位
    styles.insert(".pI_x6G_centerCol{margin-right:320px;}");

    // 探针：会话头部（session 作用域）拿 sessionId + cwd
    ctx.slots.inject("conversation.session.header.actions", function () {
      return ctx.slots.register(
        { name: "conversation.session.header.actions", id: "ws-cwd-probe", order: 99 },
        function (p) {
          return React.createElement(CwdProbe, {
            useSessions: p.useSessions,
            sessionId: p.sessionId,
            setCwd: function (c) { shared.cwd = c; },
            setSessionId: function (s) { shared.sessionId = s; }
          });
        }
      );
    });

    // 右侧文件面板
    ctx.slots.inject("shell.overlay", function () {
      return ctx.slots.register(
        { name: "shell.overlay", id: "workspace-files", order: 0 },
        function () { return React.createElement(WorkspacePanel, { ctx: ctx, getCwd: function () { return shared.cwd; } }); }
      );
    });

    // 左侧用量柱状图
    ctx.slots.inject("shell.overlay", function () {
      return ctx.slots.register(
        { name: "shell.overlay", id: "api-usage", order: 1 },
        function () { return React.createElement(UsageChart, { ctx: ctx, getSessionId: function () { return shared.sessionId; } }); }
      );
    });
  }
};
