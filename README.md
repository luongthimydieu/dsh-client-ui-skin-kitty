# 🎀 DSH Client UI Skin — Hello Kitty

一个为 **DeepSeek Harness (DSH) Web UI** 打造的 Hello Kitty 主题插件，以粉嫩的视觉风格和自定义壁纸，为你的 DSH 界面增添一份可爱与个性。

支持浅色与深色主题，并提供自定义壁纸功能。插件采用静态加载机制，安装后会随 Harness 启动自动加载，无需手动激活。

## ✨ Features

- 🎀 **Hello Kitty 风格**：以粉色为主色调，打造可爱、清新的界面。
- 🖼️ **自定义壁纸**：使用自己的壁纸图片，轻松打造个性化工作空间。
- 🌗 **浅色与深色主题**：提供适配不同显示模式的样式。
- ⚡ **自动加载**：安装后随 DSH Harness 启动自动恢复主题。
- 🔄 **热更新样式**：修改主题 CSS 后，刷新页面即可查看效果，无需重启 Harness。
- 🪶 **轻量化设计**：专注于界面主题和背景，不修改工作区原有功能。
- 📦 **支持内联样式**：提供 Base64 壁纸内联版本，方便在需要时直接注入主题样式。

## 🖼️ Preview

安装插件后，你可以获得以 Hello Kitty 粉色风格为主的 DSH 界面，并通过替换壁纸进一步自定义外观。

><img width="2547" height="1530" alt="image" src="https://github.com/user-attachments/assets/0fe98ec1-cf49-4e0f-9214-1ef8bd460e62" />


## 📁 Project Structure

```text
dsh-client-ui-skin-kitty/
├── package.json              # npm 包配置与 DSH 插件声明
├── skin.json                 # 主题元数据
├── cordis.patch.yml           # 静态插件加载配置
├── theme.css                 # 主题样式与壁纸配置
├── theme.inline.css          # 包含内联壁纸的独立 CSS 文件
├── assets/
│   └── kitty-wallpaper.jpg   # 默认壁纸
├── lib/
│   ├── index.js              # 服务端入口：提供主题 CSS 与壁纸
│   └── client.js              # 客户端入口：自动注入主题
├── scripts/
│   └── inline.mjs             # 生成内联 CSS 的脚本
├── README.md
└── LICENSE
```

## 🚀 Installation

### Requirements

- 已安装并可以正常运行的 DSH 环境。
- 支持插件安装的 DSH 版本。
- Node.js 与 npm（如果需要从源码构建或自行修改项目）。

### Install from a local directory

将项目克隆到本地：

```bash
git clone https://github.com/luongthimydieu/dsh-client-ui-skin-kitty.git
cd dsh-client-ui-skin-kitty
```

将插件安装到 DSH 的 `web` profile：

```bash
dsh plugin --profile web add file:/path/to/dsh-client-ui-skin-kitty
```

请将 `/path/to/dsh-client-ui-skin-kitty` 替换为项目的实际绝对路径。

安装完成后，重启 DSH Harness。插件加载成功后，Hello Kitty 主题将自动生效。

> **注意：** 上述命令适用于支持对应插件安装方式的 DSH 环境。不同版本的 DSH 可能存在配置差异，请以实际环境为准。

## 🎨 Customization

### 1. Change the wallpaper

替换以下文件即可更换默认壁纸：

```text
assets/kitty-wallpaper.jpg
```

建议使用与原文件兼容的 JPEG 图片，并注意图片分辨率和文件大小，以兼顾显示效果与加载速度。

替换壁纸后，执行以下命令重新生成内联样式：

```bash
npm run inline
```

### 2. Customize the theme

编辑项目根目录下的 `theme.css`，即可修改主题配色、背景、透明度及其他 CSS 样式。

```css
/* Example: customize the wallpaper */
:root {
  --kitty-wallpaper: url("/kitty/wallpaper.jpg");
}
```

主题 CSS 由插件提供的静态路由返回。正常情况下，修改 `theme.css` 后刷新页面即可看到变化，无需重启 Harness。

如果同时使用 `theme.inline.css`，请在修改主题或壁纸后重新执行 `npm run inline`，确保内联版本与最新配置保持一致。

### 3. Compatibility across DSH versions

DSH 的部分界面使用 CSS Modules 生成的类名，这些类名可能随版本变化。

本项目通过多种 CSS 选择器匹配主界面，包括已知的框架类名、结构选择器和 `body` 级别的兜底规则，以尽可能提高兼容性。

如果升级 DSH 后壁纸无法正常显示，可以检查当前版本的页面结构，并根据实际情况调整 `theme.css` 中的选择器。

## ⚙️ How It Works

本项目通过 DSH 插件机制加载主题，主要由服务端和客户端两部分组成：

1. **Plugin registration**：通过 `package.json` 和 `cordis.patch.yml` 声明插件及静态加载入口。
2. **Static asset serving**：服务端注册 `/kitty/theme.css` 和 `/kitty/wallpaper.jpg` 路由，分别提供主题样式与壁纸资源。
3. **Automatic style injection**：客户端启动时向页面添加主题 CSS 的 `<link>` 标签。
4. **Persistent appearance**：Harness 启动并成功加载插件后，主题会自动应用，无需每次手动开启。

主题插件主要负责界面外观，不提供独立的聊天、模型调用或任务管理功能。

## 🛠️ Development

安装依赖（如果项目配置了相应依赖）：

```bash
npm install
```

重新生成内联 CSS：

```bash
npm run inline
```

打包为 npm 安装包：

```bash
npm pack
```

发布到 npm：

```bash
npm login
npm publish --access public
```

发布前，请检查 `package.json` 中的包名、版本号、入口文件和发布配置，并确认相关资源已包含在安装包中。

## 🤝 Contributing

欢迎提交 Issue 和 Pull Request，包括但不限于：

- 新的配色方案与壁纸适配。
- 不同 DSH 版本的兼容性修复。
- CSS 样式优化与加载体验改进。
- 安装文档和使用说明完善。

提交前请尽量在目标 DSH 版本中验证主题加载、壁纸显示及浅色和深色模式的表现。

## 📄 License

本项目采用 [MIT License](LICENSE) 开源。使用、修改和分发时，请遵守许可证条款。

---

Made with 🎀 for a cuter DSH workspace.
