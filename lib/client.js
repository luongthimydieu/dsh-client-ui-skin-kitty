// ==========================================================================
// dsh-client-ui-skin-kitty — Client 插件半（静态插件，ModuleLoader 格式，纯主题）
// --------------------------------------------------------------------------
// 只做一件事：启动时把 Kitty 主题 CSS 注入页面（Host 半提供
// /kitty/theme.css + /kitty/wallpaper.jpg），主题与壁纸随 Harness 启动
// 自动恢复。已移除右侧文件面板 / token 用量图等全部工作区功能。
// ==========================================================================

window.__ModuleLoader__.load({
  id: "dsh-client-ui-skin-kitty",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    function apply(ctx) {
      // Kitty 主题样式：以 <link> 注入 Host 半提供的 /kitty/theme.css
      // （幂等：已有同 id 元素则跳过，重复激活不会叠加）。
      if (typeof document !== "undefined") {
        const themeId = "dsh-client-ui-skin-kitty-theme";
        if (!document.getElementById(themeId)) {
          const link = document.createElement("link");
          link.id = themeId;
          link.dataset.plugin = "dsh-client-ui-skin-kitty";
          link.rel = "stylesheet";
          link.href = "/kitty/theme.css";
          document.head.appendChild(link);
        }
      }
    }

    exports.apply = apply;
    exports.inject = [];
    return module.exports;
  }
});
