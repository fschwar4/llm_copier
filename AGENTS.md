# AGENTS.md

Instructions for coding agents (Claude Code, Codex, …) working in this repository.

## Git: the user commits, not the agent

- Never commit, push, tag, or otherwise change git history or the remote yourself.
  Read-only git commands (`status`, `diff`, `log`, `show`) are fine.
- Instead, give the user ready-to-run bash commands:
  - Start every command block that runs git with `cd <absolute path of the repository root> &&`,
    so it works no matter which directory the user's shell is in.
  - Group commands to minimise copy-paste: chain steps that belong together with `&&` in a
    single block (a failing step stops the chain). Start a new block only where the user has
    to do something in between, such as checking output or testing in Firefox.

## Project overview

Firefox extension (Manifest V3) that exports chats from ChatGPT, Claude and Gemini as
Markdown, PDF or raw HTML. Everything runs client-side. There is no build step for the source
and no npm dependencies.

- `src/extractors.js`: per-platform extraction to Markdown (`parseChatGPT*`, `parseClaude`,
  `parseGemini`, model/user name helpers). The platforms change their DOM often; most fixes
  land here.
- `src/popup.js`: popup logic. Injects scripts into the active tab, collects the page HTML
  (or the ChatGPT backend API response) and runs the extractors.
- `src/markdown2pdf.js`: Markdown → PDF via pdfmake.
- `src/lib/`: vendored third-party libraries (pdfmake, highlight.js). Do not edit.
- `dist/`: the built release zip, committed. Only the current version is kept.

## Testing

- `npm test` uses the Node built-in test runner (nothing to install). It checks the manifest
  and file integrity only, not extraction.
- Check extraction changes against a saved copy of the affected chat page
  ("Save Page As… → Web Page, complete"), then load `src/` as a temporary add-on via
  `about:debugging#/runtime/this-firefox` and export for real.
- Never commit saved chat pages or exported PDFs; they contain personal data.
- GitHub Actions (`.github/workflows/ci.yml`) runs `npm test` and `web-ext lint` on pushes and
  pull requests to `main`.

## Releases

Follow `docs/developer_notes.md`. In short: bump `version` in `src/manifest.json`, add a
`CHANGELOG.md` entry, `git rm` the old zip in `dist/`, run `./scripts/build.sh`, commit as
`release vX.Y.Z: <summary>` and tag `vX.Y.Z`. Hand these over as commands (see above).
