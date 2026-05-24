<p align="center">
  <img src="./docs/assets/coremi-team-wordmark.svg" alt="Coremi Team Community Lite" width="760">
</p>

<p align="center">
  <strong>本地优先的多模型 AI 群聊工作台</strong>
</p>

<p align="center">
  <a href="./README.md">English</a>
  ·
  <a href="./COMPLIANCE.md">合规说明</a>
  ·
  <a href="./PRIVACY.md">隐私说明</a>
  ·
  <a href="./CONTRIBUTING.md">参与贡献</a>
</p>

# Coremi Team Community Lite

Coremi Team Community Lite 是 Coremi Team 的开源社区轻量版。它是一个本地优先的 Chrome 扩展，用来在浏览器里组织多个 AI、多个模型进行群聊讨论。

你可以创建一个 AI 团队，为不同成员选择支持的 AI 网站或自定义 GPT 链接，然后把一个任务发到同一个讨论室里，对比回复、添加文件资料、做笔记，并导出 Markdown。

这个仓库刻意做成 **Lite** 版本：它用于建立信任、吸收反馈、方便个人使用，但不公开 Coremi 的私有研究工作流、付费模板、新闻编辑室 SOP 或商业交付方法。

## 包含什么

- 本地多群聊工作台。
- 人员库和自定义 AI 成员。
- 支持 ChatGPT、Claude、Gemini、DeepSeek 和自定义 GPT 链接。
- 同一任务发送给多个 AI 成员，并在一个房间里汇总回复。
- 支持从输入框添加文件和图片；`.docx`、`.rtf`、文本、Markdown、CSV、JSON，以及基础文本型 PDF 会在本地抽取文字后进入智能体上下文。
- 全局笔记和群聊笔记。
- Markdown 导出。
- Chrome 扩展本地存储。
- 收敛后的 Chrome 扩展权限。
- 没有内测码、没有激活门槛、没有固定私有扩展 key。

## 不包含什么

- Coremi AI 的私有机构研究工作流。
- Coremi VIP 或 Coremi Media 的商业内容系统。
- Coremi 内部实践中的金融、交易、投资决策模板。
- Coremi 托管服务器、数据分析、账号系统或支付系统。
- 内置 OpenAI、Anthropic、Google、DeepSeek API Key。

## 支持的网站

- ChatGPT: <https://chatgpt.com/>
- Claude: <https://claude.ai/>
- Gemini: <https://gemini.google.com/>
- DeepSeek: <https://chat.deepseek.com/>

这些网站经常调整前端页面。如果某个适配失效，欢迎提交 issue，并说明站点、浏览器版本和复现步骤。

## 从源码安装

1. 下载或 clone 本仓库。
2. 运行 `npm install`。
3. 运行 `npm run build`。
4. 打开 Chrome，进入 `chrome://extensions/`。
5. 打开右上角「开发者模式」。
6. 点击「加载已解压的扩展程序」。
7. 选择生成后的 `dist/` 文件夹。
8. 点击浏览器右上角扩展图标里的 Coremi Team。

使用网站型 AI 成员前，请先在同一个 Chrome 用户里登录你要使用的 AI 网站。

## 工作方式

Coremi Team Community Lite 会把用户选择的 AI 网站加载到扩展工作台中，通过用户自己的浏览器会话发送提示词，再把网页里可见的模型回复读取回本地房间。

很多 AI 网站默认禁止 iframe 加载，所以扩展使用 Chrome `declarativeNetRequest` 规则，在这些网站作为子框架加载时调整与 iframe 相关的响应头。

## 用户责任

用户需要自行遵守所使用 AI 服务的条款和政策。本项目不提供 AI 服务账号，不绕过付费墙，不绕过模型限制，也不授予任何第三方服务访问权。

除非你理解每个 AI 服务商的政策，否则不要发送机密、受监管或敏感信息。

## 权限说明

Coremi Team Community Lite 会请求：

- `storage`：在本地保存群聊、成员、笔记、模板和界面状态。
- `tabs`：打开 Coremi Team 页面并协调 AI 网站页面。
- `declarativeNetRequest`：让支持的 AI 网站能在扩展工作台中加载。
- `clipboardRead` / `clipboardWrite`：只在部分支持站点的适配需要时，用于复制或粘贴内容。
- AI 网站 host permissions：在支持的网站上运行内容脚本。

manifest 不请求宽泛的 `https://*/*` 或 `http://*/*` host 权限。

## 开发说明

主要文件：

- `public/manifest.json`：Chrome 扩展清单。
- `src/background/`：后台服务和群聊编排。
- `src/content/`：注入到 AI 网站的适配脚本。
- `src/teamPage/`：Coremi Team 主界面。
- `public/openteam-frame-rules.json`：支持站点的 iframe 响应头规则。
- `dist/`：构建产物，已被 Git 忽略。

常用命令：

```bash
npm install
npm run typecheck
npm test
npm run build
```

## 项目边界

Coremi Team Community Lite 是一个社区工具。更大的 Coremi 产品线保持独立：

- **Coremi AI**：机构研究系统。
- **Coremi Media**：公共媒体与传播层。
- **Coremi VIP**：付费深度内容层。
- **Coremi Team Community Lite**：开源本地 AI 团队工作台。

## 贡献

欢迎提交 issue 和 pull request。请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

Coremi Team Community Lite 使用 MIT License 开源。详见 [LICENSE](./LICENSE)。
