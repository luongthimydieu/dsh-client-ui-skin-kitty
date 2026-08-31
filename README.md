# dsh-client-ui-skin-kitty 🎀

一个面向 **DeepSeek Harness (DSH) Web UI** 的插件项目，包含两部分：

1. **Hello Kitty 皮肤**（粉色主题 + 自定义壁纸）
2. **工作区插件**（右侧文件面板 + 文件预览 + 左侧「本对话 token」用量柱状图）

## 目录结构

```
dsh-client-ui-skin-kitty/
├── package.json           # npm 清单（皮肤 + 插件双入口，声明 dsh.bundle.patch）
├── skin.json              # 皮肤元数据（皮肤中心读取）
├── cordis.patch.yml       # ★ bundle patch：把本包注册为静态 loader entry
├── theme.css              # Hello Kitty 主题（浅/深色，壁纸走 /kitty/wallpaper.jpg）
├── theme.inline.css       # 单文件版：壁纸 base64 内联，可直接注入
├── assets/
│   └── kitty-wallpaper.jpg    # 壁纸照片（替换它即可换壁纸）
├── lib/
│   ├── index.js           # ★ Host 插件半：文件服务 + token 统计 + /ws-file + /kitty/* 路由
│   └── client.js          # ★ Client 插件半：文件面板 + 预览 + 用量柱状图 + 主题注入
├── scripts/inline.mjs     # 一键重新生成 theme.inline.css
├── README.md
└── LICENSE
```

## 一、皮肤（Hello Kitty 主题）

皮肤覆盖 DSH 的 `--dsw-alias-*` / `--dsw-specific-*` 语义 token，把界面变成粉色系，并在底层铺上你的壁纸。

**三种使用方式：**

| 方式 | 说明 |
|---|---|
| 直接注入 CSS | 把 `theme.inline.css` 追加到 DSH 前端编译产物：`cat theme.inline.css >> node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-*.css`，刷新生效 |
| 静态插件（推荐） | 把本包安装进 DSH profile（见下文），插件随 Harness 启动自动加载：右侧栏 + 主题背景一起恢复 |
| 皮肤中心 | `npm install <本目录>` 或发布后 `npm install dsh-client-ui-skin-kitty`，交给 dsh-web-ui 皮肤中心加载 |
| 换壁纸 | 替换 `assets/kitty-wallpaper.jpg`，再 `npm run inline` |

## 二、工作区插件（文件面板 + 用量图）

插件由 Host 半（`lib/index.js`）和 Client 半（`lib/client.js`）组成：

- **Host 半** 提供：`ws/tree`（列文件树）、`ws/read`（读文本）、`ws/stats`（token 用量）、`/ws-file`（HTTP 提供文件给图片/PDF 预览）。
- **Client 半** 渲染：右侧「工作区文件」面板、独立预览弹窗、左侧「本对话 tokens」柱状图。

**作为动态插件运行（仅临时体验）：**

把两个文件的内容分别作为 `cordis_define` 的 `code.host` 和 `code.client` 提交，再 `cordis_run` 激活即可。两个文件都已经是 `return { apply(ctx) {...} }` 插件体，可直接粘贴。

> 注意：动态插件跟随当前会话，**刷新页面后需要重新 `cordis_run` 激活**。

**升级为静态插件（刷新/重启自动恢复，本仓库当前形态 ✅）：**

仓库已完成静态化改造：

1. `package.json` 声明 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" }, "client": {...} }`。
2. `cordis.patch.yml` 把本包注册为一条静态 loader entry。
3. `lib/index.js`（Host）已是 `export function apply(ctx)`；`lib/client.js`（Client）已是 `window.__ModuleLoader__.load(...)` 格式。

**安装进 DSH profile（桌面端/Web 端都会在重启后自动加载）：**

```bash
# 在 DSH 的 web profile 里安装本包（路径换成你的实际路径）
dsh plugin --profile web add file:/path/to/dsh-client-ui-skin-kitty

# 或在 DSH Desktop 中：把本目录作为插件源安装后，重启 Harness
```

安装后 `dsh plugin` 会把它追加到 profile 的 `dsh.profile.bundles`，重启 Harness 即生效：
- **右侧栏**（工作区文件面板 + 用量图）随启动自动打开；
- **Kitty 背景主题**由 Client 半注入 `/kitty/theme.css`（Host 半提供），同样随启动恢复。

具体字段以 DSH 当前版本的静态插件加载规范为准。

## 三、以后怎么加功能

整个插件是「Host 半 + Client 半」的结构，加功能就是改这两个文件里的代码：

### 加一个「读 Host 数据 → 显示在界面上」的功能

1. **Host 半（`lib/index.js`）** 加一个 RPC 处理器：
   ```js
   harness.handle("my/new-rpc", async function (args) {
     // 在这里用 fs、sessions 等服务拿数据，返回 JSON
     return { some: "data" };
   });
   ```
2. **Client 半（`lib/client.js`）** 调用它并渲染：
   ```js
   host.call("my/new-rpc", { arg: 1 }).then(function (res) { /* 更新状态 */ });
   ```

### 加一个「新的界面区块」

在 `lib/client.js` 的 `apply(ctx)` 里注册到对应 Slot（先用 `cordis_inspect_query` 查 `Slots.listSubTree` 确认 Slot 名字和协议）：

```js
ctx.slots.inject("某个.slot", function () {
  return ctx.slots.register(
    { name: "某个.slot", id: "my-feature", order: 0 },
    function () { return React.createElement(MyComponent, {}); }
  );
});
```

### 改主题颜色 / 加新 token

直接编辑 `theme.css`，改完后 `npm run inline` 重新生成内联版。

### 调试

- Host 日志用 `console.log(...)`（带插件标签）。
- Client 日志用 `console.log(...)`（浏览器控制台）。
- 插件报错后，用 `cordis_inspect_self(pluginId, packageId)` 查看诊断信息。

### 依赖的 DSH 接口速查

| 用途 | 接口 |
|---|---|
| 文件系统 | Host 服务 `fs`（`resolve`/`listDir`/`readText`/`readBytes`/`stat`） |
| 工作区根目录 | 客户端 Slot 的 `useSessions` → 当前会话 `cwd` |
| token 用量 | Host 服务 `tokenMeter`（`measure(session).surfaceTokens`） |
| Client→Host 通信 | Host `harness.handle`，Client `host.call` |
| 界面挂载点 | Client `ctx.slots`（`shell.overlay`、`conversation.*` 等） |
| 定时轮询 | Client `ctx.interval(cb, ms)`（需 `inject: ["timer"]`） |

## 四、打包 & 发布

```bash
npm run inline   # 重新生成单文件内联版（改壁纸后）
npm pack         # 产出 dsh-client-ui-skin-kitty-1.0.0.tgz
npm publish --access public   # 发布到 npm（需先 npm login）
```

## 五、推送到你的 GitHub

```bash
cd dsh-client-ui-skin-kitty

# 先在 github.com/luongthimydieu 新建空仓库 dsh-client-ui-skin-kitty（不要勾 README/.gitignore）
git remote add origin https://github.com/luongthimydieu/dsh-client-ui-skin-kitty.git
git branch -M main
git push -u origin main
```

## License

[MIT](LICENSE)
