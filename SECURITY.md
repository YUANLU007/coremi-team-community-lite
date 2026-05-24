# Security Policy

## Reporting a Vulnerability

Please report security issues privately before opening a public issue.

Send a report to the project maintainer with:

- A description of the issue.
- Steps to reproduce.
- The affected browser and extension version.
- Any relevant screenshots or logs with secrets removed.

## Scope

Security-sensitive areas include:

- Leaks of prompts, replies, notes, or external model API keys.
- Unexpected network requests.
- Unsafe handling of model endpoints or API credentials.
- Site-adapter behavior that sends content to the wrong AI page.
- Permission changes in `manifest.json`.

## Local Data

Coremi Team Community Lite stores user data in Chrome extension storage. Treat your browser profile as sensitive if you store external model API keys.
