# dsh-client-ui-skin-kitty 🎀

Hello Kitty（凯蒂猫）主题皮肤 / 插件，用于 **DeepSeek Harness (DSH) Web UI**。

粉色系调色板 + 自定义壁纸背景，兼容浅色 / 深色两套配色方案，既可当静态皮肤包用，也可当 DSH 原生客户端插件加载。

## ✨ 特性

- 完整覆盖 DSH `--dsw-alias-*` / `--dsw-specific-*` 语义 token（82 个，浅色 + 深色各一套）
- 玫瑰粉主色 `#e75480` + 樱花粉强调 `#f48fb1` + 奶白奶油底，深色为深梅子暗色
- 自定义壁纸背景（浅色原图铺满、深色叠加暗色柔化保证文字可读）
- 单文件内联版（壁纸 base64），零依赖直接注入

## 📁 目录结构

```
dsh-client-ui-skin-kitty/
├── package.json           # npm 清单（可 npm pack / npm publish）
├── skin.json              # 皮肤元数据
├── LICENSE                # MIT
├── .gitignore
├── .gitattributes
├── theme.css              # 皮肤：覆盖 --dsw-* token（壁纸走相对路径）
├── theme.inline.css       # 单文件版：壁纸 base64 内联，可直接注入
├── assets/
│   └── kitty-wallpaper.jpg    # 壁纸照片（原始文件，随时替换）
├── lib/
│   └── client.js          # DSH 原生客户端插件（theme.overrideTokens + styles.insert）
└── scripts/
    └── inline.mjs         # 生成 theme.inline.css（npm run inline）
```

## 🧩 原理

DSH 前端用两层 CSS 变量实现主题：

- `--dsw-static-*`：静态色阶（原始色板，通常不改）
- `--dsw-alias-*` / `--dsw-specific-*`：语义别名层（浅色写在 `body {}`，深色写在 `body[data-ds-dark-theme] {}`）

本皮肤只覆盖**别名层**，完整替换品牌色、背景、边框、按钮、文本、Markdown 代码块、滚动条、侧边栏、气泡等外观；错误 / 成功 / 警告等语义状态保留功能色。

## 🚀 使用方式

### 方式一：DSH 原生客户端插件（推荐）

`lib/client.js` 是一个自包含的 DSH 客户端插件：通过 `theme` 服务的 `overrideTokens` 注册粉色 token（自动适配浅色/深色），并通过 `styles.insert` 注入壁纸。可热插拔、可撤销，不污染编译产物。

### 方式二：静态皮肤包（dsh-web-ui 皮肤中心）

```bash
npm install <本目录路径>          # 本地调试
npm publish && npm install dsh-client-ui-skin-kitty   # 发布后安装
```

> dsh-web-ui 的皮肤列表是其构建期静态数组（见其 Issue #134），若未被自动识别，
> 需在其源码把 `kitty` 注册进皮肤列表；建议先跑官方 `scripts/dsh-skin` 核对规范。

### 方式三：直接注入 CSS

把 `theme.inline.css` 追加到 DSH 前端编译产物：

```bash
cat theme.inline.css >> node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-*.css
```

刷新即生效。缺点：升级 / 重装依赖会被覆盖。

## 📦 打包

```bash
npm run inline   # 生成单文件内联版（可选）
npm pack         # 产出 dsh-client-ui-skin-kitty-1.0.0.tgz
npm publish --access public   # 发布到 npm（需先 npm login）
```

## 🔁 更换壁纸

1. 把新照片覆盖到 `assets/kitty-wallpaper.jpg`（保持文件名）。
2. `npm run inline` 重新生成 `theme.inline.css`；同时 `lib/client.js` 里的 base64 也需同步更新（见 `scripts/inline.mjs` 扩展）。

## 🌐 推送到你的 GitHub

```bash
cd dsh-client-ui-skin-kitty

git init
git add .
git commit -m "feat: Hello Kitty theme skin for DSH Web UI"

# 先在 github.com 新建一个空仓库（不要勾选 README/.gitignore），然后：
git remote add origin https://github.com/luongthimydieu/dsh-client-ui-skin-kitty.git
git branch -M main
git push -u origin main
```

`package.json` 里的 `repository` 已按 GitHub 账号 `luongthimydieu` 配置；如需改名再改这里。

## 📄 License

[MIT](LICENSE)
