# Community Lite Compliance Notes

This file tracks the compliance posture for the open-source Community Lite edition.

## Current Position

Coremi Team Community Lite is positioned as a local-first AI team workspace. Its single purpose is to let a user run a structured group discussion across supported AI web products and custom GPT links from the user's own browser session.

## Risk Reductions Already Applied

- Removed the beta access gate and activation code.
- Removed the fixed private extension key.
- Added a clear privacy policy.
- Added security reporting instructions.
- Added a narrow-permission manifest.
- Removed broad `https://*/*` and `http://*/*` host permissions.
- Limited host permissions and content scripts to supported AI websites.
- Kept extension logic local; no remote hosted extension code is loaded.
- Removed Coremi private research workflows, paid-product documents, and financial/trading templates from this Community Lite package.

## Remaining Sensitive Areas

- The extension uses `declarativeNetRequest` to adjust iframe-blocking headers for supported AI sites when they are loaded as subframes.
- The extension reads and writes content inside supported AI web apps on behalf of the user.
- AI provider websites may change their UI, which can break adapters.
- Custom external API endpoints should not be enabled in a public store build until they use an explicit runtime permission flow and clear user disclosure.

## Public Listing Language

Use plain disclosure in any public listing:

> Coremi Team Community Lite loads selected AI websites inside an extension workspace, sends prompts that you type to the AI services you choose, and reads visible replies back into your local group chat. Chat history, notes, and role templates are stored in Chrome extension local storage. Users are responsible for following the terms of the AI services they choose to use.

## Permission Justification

- `storage`: stores local chats, notes, people, templates, and UI state.
- `tabs`: opens the extension workspace and coordinates supported AI-site frames.
- `declarativeNetRequest`: allows supported AI sites to load in the workspace by adjusting frame-related response headers.
- `clipboardRead` / `clipboardWrite`: used by site adapters when the AI website requires clipboard-based copy or paste interaction.
- Supported AI-site host permissions: required to inject adapters into the selected AI websites.

## Before Public Release Checklist

- [ ] Test ChatGPT custom GPT link flow.
- [ ] Test Claude, Gemini, and DeepSeek login states.
- [ ] Confirm no broad host permissions remain.
- [ ] Confirm privacy policy matches actual data handling.
- [ ] Prepare screenshots showing the local AI team discussion workflow.
- [ ] Prepare a short demo video if iframe behavior needs context.
