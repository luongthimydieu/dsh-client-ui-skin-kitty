# dsh-client-ui-skin-kitty 🎀

一个面向 **DeepSeek Harness (DSH) Web UI** 的 **Hello Kitty 皮肤插件**（粉色主题 + 自定义壁纸）。
已精简为纯主题：**只保留背景/主题**，右侧文件面板、token 用量图等工作区功能已移除。

作为**静态插件**运行：安装进 DSH profile 后，主题与壁纸随 Harness 启动自动恢复，无需手动激活。

## 目录结构

```
dsh-client-ui-skin-kitty/
├── package.json           # npm 清单（声明 dsh.bundle.patch + dsh.client）
├── skin.json              # 皮肤元数据
├── cordis.patch.yml       # bundle patch：把本包注册为静态 loader entry
├── theme.css              # Hello Kitty 主题（浅/深色，壁纸走 /kitty/wallpaper.jpg）
├── theme.inline.css       # 单文件版：壁纸 base64 内联，可直接注入
├── assets/
│   └── kitty-wallpaper.jpg    # 壁纸照片（替换它即可换壁纸）
├── lib/
│   ├── index.js           # Host 半：提供 /kitty/theme.css + /kitty/wallpaper.jpg
│   └── client.js          # Client 半：启动时注入主题样式
├── scripts/inline.mjs     # 一键重新生成 theme.inline.css
├── README.md
└── LICENSE
```

## 工作原理（静态插件）

1. `package.json` 声明 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" }, "client": {...} }`。
2. `cordis.patch.yml` 把本包注册为一条静态 loader entry。
3. **Host 半**（`lib/index.js`）用 `ctx.inject(["webServer"], ...)`（与 dsh-desktop-market-installer
   相同的模式）注册两个静态路由：`/kitty/theme.css`、`/kitty/wallpaper.jpg`。
4. **Client 半**（`lib/client.js`）启动时注入
   `<link rel="stylesheet" href="/kitty/theme.css">`（幂等），主题即生效。

> 踩坑记录：Host 半**不能**用 `ctx.get("fs")` / `ctx.get("webServer")` —— profile 根 context
> 里拿不到这些服务，会导致插件静默失效（apply 提前 return、无任何报错）。必须显式
> `ctx.inject(["webServer"], cb)`。壁纸选择器用的是当前 DSH Desktop 版本的
> `.m45BUG_frame` 主框架类（旧版为 `.pI_x6G_frame`，换版本需同步更新）。

## 安装进 DSH profile（桌面端/Web 端重启后自动加载）

```bash
# 在 DSH 的 web profile 里安装本包（路径换成你的实际路径）
dsh plugin --profile web add file:/path/to/dsh-client-ui-skin-kitty
```

安装后重启 Harness 即生效：Kitty 粉色主题 + 壁纸自动恢复。

## 换壁纸 / 改主题

- 换壁纸：替换 `assets/kitty-wallpaper.jpg`，再 `npm run inline`（生成新内联版）。
- 改主题：直接编辑 `theme.css`，改完 `npm run inline`；若 DSH 版本的主框架类变了，
  同步更新 `theme.css` 里的 `.m45BUG_frame` 选择器。

## 打包 & 发布

```bash
npm run inline   # 重新生成单文件内联版（改壁纸后）
npm pack         # 产出 dsh-client-ui-skin-kitty-1.0.0.tgz
npm publish --access public   # 发布到 npm（需先 npm login）
```

## 推送到你的 GitHub

```bash
cd dsh-client-ui-skin-kitty
git remote add origin https://github.com/luongthimydieu/dsh-client-ui-skin-kitty.git
git branch -M main
git push -u origin main
```

## License

[MIT](LICENSE)
