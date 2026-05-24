<p align="center">
  <img src="./docs/assets/coremi-team-wordmark.svg" alt="Coremi Team Community Lite" width="760">
</p>

<p align="center">
  <strong>Local-first multi-model AI discussion workspace</strong>
</p>

<p align="center">
  <a href="./README.zh-CN.md">中文</a>
  ·
  <a href="./COMPLIANCE.md">Compliance</a>
  ·
  <a href="./PRIVACY.md">Privacy</a>
  ·
  <a href="./CONTRIBUTING.md">Contributing</a>
</p>

# Coremi Team Community Lite

Coremi Team Community Lite is the open-source community edition of Coremi Team, a local-first Chrome extension for running multi-model AI group discussions in your browser.

It helps you create an AI team, assign people to supported AI websites or custom GPT links, send one task into a shared room, compare replies, attach source files, keep notes, and export the discussion as Markdown.

This repository is intentionally a **Lite** edition. It is designed to build trust, invite community feedback, and provide a useful personal AI workspace without publishing Coremi's private research workflows, paid templates, newsroom operations, or commercial delivery methods.

## What Is Included

- Local multi-chat workspace.
- People library and custom AI people.
- Website-based roles for ChatGPT, Claude, Gemini, DeepSeek, and custom GPT links.
- Shared prompt composer and multi-role reply collection.
- File and image attachments from the composer, including local text extraction for `.docx`, `.rtf`, text, Markdown, CSV, JSON, and basic text-based PDF parsing.
- Global notes and per-chat notes.
- Markdown export.
- Local Chrome extension storage.
- Narrow Chrome extension permissions.
- No beta code, no activation gate, no fixed private extension key.

## What Is Not Included

- Coremi AI's private institutional research workflows.
- Coremi VIP or Coremi Media commercial content systems.
- Financial, trading, or investment decision templates from Coremi's internal practice.
- Any hosted Coremi server, analytics, account system, or payment flow.
- Built-in OpenAI, Anthropic, Google, or DeepSeek API keys.

## Supported AI Sites

- ChatGPT: <https://chatgpt.com/>
- Claude: <https://claude.ai/>
- Gemini: <https://gemini.google.com/>
- DeepSeek: <https://chat.deepseek.com/>

These sites change their web UI often. If one adapter stops working, please open an issue with the site name, browser version, and a short description of what failed.

## Install From Source

1. Download or clone this repository.
2. Run `npm install`.
3. Run `npm run build`.
4. Open Chrome and go to `chrome://extensions/`.
5. Turn on **Developer mode**.
6. Click **Load unpacked**.
7. Select the generated `dist/` folder.
8. Click the Coremi Team extension icon to open the team room.

Before using website-based roles, log in to the AI sites you want to use in the same Chrome profile.

## How It Works

Coremi Team Community Lite loads selected AI websites inside an extension workspace, sends prompts through the site UI under the user's browser session, and reads visible model replies back into the local room.

Because many AI websites block iframe loading by default, the extension uses Chrome `declarativeNetRequest` rules to adjust frame-related response headers for supported AI sites when they are loaded as subframes.

## User Responsibility

Users are responsible for following the terms and policies of the AI services they choose to use. This project does not provide AI service accounts, does not bypass paywalls, does not bypass model limits, and does not grant access to third-party services.

Do not send confidential, regulated, or sensitive information unless you understand the policies of every provider involved in the group chat.

## Permissions

Coremi Team Community Lite asks for:

- `storage`: save chats, people, notes, templates, and UI state locally.
- `tabs`: open the Coremi Team page and coordinate AI-site frames.
- `declarativeNetRequest`: allow supported AI sites to load inside the extension workspace.
- `clipboardRead` / `clipboardWrite`: copy or paste content only when a supported site adapter needs clipboard-based interaction.
- AI-site host permissions: run the content script on supported AI sites.

The manifest does not request broad `https://*/*` or `http://*/*` host permissions.

## Development

Main files:

- `public/manifest.json`: Chrome extension manifest.
- `src/background/`: service worker and group orchestration.
- `src/content/`: site adapters injected into supported AI websites.
- `src/teamPage/`: Coremi Team interface.
- `public/openteam-frame-rules.json`: iframe header rules for supported AI sites.
- `dist/`: generated extension package, ignored by Git.

Useful commands:

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Project Boundary

Coremi Team Community Lite is a community tool. The broader Coremi product line remains separate:

- **Coremi AI**: institutional research system.
- **Coremi Media**: public media and distribution layer.
- **Coremi VIP**: paid/deep content layer.
- **Coremi Team Community Lite**: open-source local AI team workspace.

## Coremi Ecosystem

Coremi Team Community Lite is the open-source local workspace layer of the broader Coremi ecosystem.

- **Coremi AI**: <https://coremi.ai> — institutional research system.
- **Coremi Media**: <https://coremi.media> — public media and publishing layer.
- **Coremi Team Community Lite**: this repository — open-source local AI team workspace.

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## License

Coremi Team Community Lite is released under the MIT License. See [LICENSE](./LICENSE).
