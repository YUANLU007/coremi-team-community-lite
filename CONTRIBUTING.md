# Contributing

Thanks for helping improve Coremi Team Community Lite.

## Good Issues to File

- A supported AI site changed its UI and prompts no longer send.
- Replies are not detected or copied correctly.
- A permission can be narrowed without breaking functionality.
- Documentation is unclear.
- A new AI site or model provider should be supported.
- A community template can help users without exposing private workflows or regulated decision advice.

## Pull Request Guidelines

- Keep changes focused and easy to review.
- Do not commit real API keys, tokens, cookies, or private conversation data.
- Do not commit Coremi private workflows, paid templates, client materials, financial/trading decision templates, or proprietary operating procedures.
- Test by loading the extension through `chrome://extensions/`.
- Include the browser version and AI site tested when changing site adapters.
- Update README or privacy notes when permissions or data handling change.

## Testing Checklist

Before opening a PR, please verify:

- The extension loads as an unpacked Chrome extension.
- The Coremi Team Community Lite page opens from the extension icon.
- Existing chats still load from local storage.
- At least one website-based role can receive a prompt and return a reply.
- External model settings still save locally if you changed model logic.
