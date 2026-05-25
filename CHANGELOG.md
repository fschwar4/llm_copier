# Changelog

All notable changes to the LLM Markdown Copier Firefox extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).


## [0.2.14] - 2026-05-25

### Fixed

- Italic markdown (`*text*` from `<em>` tags) now renders italic in PDF output instead of leaking literal asterisks. The PDF's inline parser previously only handled `**bold**`, backticks, and links, so single-asterisk italic — common in Claude responses — fell through as plain text. Italic detection uses non-whitespace adjacency to avoid false positives on prose like `2 * 3 = 6`.


## [0.2.13] - 2026-05-17

### Added

- Configurable **Inline Code Color** in PDF Settings (default `#1039ef`, replacing the previous hardcoded `#d63384`).

### Changed

- Extended PDF header support from h7 to h10. `nodeToMarkdown` now handles source `<h5>`/`<h6>` (previously dropped to plain text), and the Claude/Gemini shift regex was widened to `#{1,8}` so deep headers no longer cap at h8. Added `h8`–`h10` styles with progressively lighter italic grey.

### Fixed

- ChatGPT long-conversation exports no longer drop off-screen turns. ChatGPT virtualizes its conversation list, so turns not near the viewport are never rendered to the DOM. The extension now fetches the conversation directly from `chatgpt.com/backend-api/conversation/{id}` using the page's existing session token (the same approach used by mature exporters such as [pionxzh/chatgpt-exporter](https://github.com/pionxzh/chatgpt-exporter)). DOM-based extraction with a scroll-based pre-render is kept as a fallback when the API call is unavailable (e.g. a brand-new chat without a conversation ID).


## [0.2.12] - 2026-05-17

### Fixed

- ChatGPT extraction returned empty output after `chatgpt.com` removed the `<article>` wrappers around conversation turns. Messages are now located via `[data-message-author-role]`, and user text is read from the new `[data-testid="collapsible-user-message-content"]` container.


## [0.2.11] - 2026-03-14

### Added

- Test suite for manifest validation and file integrity (`tests/`).
- GitHub Actions CI workflow running `npm test` and `web-ext lint` on every push/PR.
- Build script (`scripts/build.sh`) to create clean, versioned ZIP archives.

### Fixed

- Firefox ESR compatibility: lowered `strict_min_version` from `142.0` to `109.0` so the extension installs on Firefox ESR 140 and older MV3-capable versions ([#1](https://github.com/fschwar4/llm_copier/issues/1)).


## [0.2.10] - 2026-01-03

### Added

- Customisable table styling in PDF Settings (header fill color, border color, line width).


## [0.2.9] - 2026-01-03

### Added

- Table layout support for PDF export.


## [0.2.8] - 2025-12-21

### Fixed

- Resolved Firefox `innerHTML` assignment warning by switching to `DOMParser`.


## [0.2.7] - 2025-12-21

### Changed

- Complete directory refactoring.
- Removed macOS-specific files (`.DS_Store`) from distribution ZIP.


## [0.2.6] - 2025-12-21

### Added

- PDF Settings page for customising font sizes, margins, and color scheme.
- Extended syntax highlighting to additional programming languages.


## [0.2.5] - 2025-12-21

### Added

- Code syntax highlighting in PDF export using [highlight.js](https://highlightjs.org/).


## [0.2.4] - 2025-12-21

### Added

- GitHub link in the extension popup window.


## [0.2.3] - 2025-12-21

### Fixed

- Gemini exports now use a descriptive PDF title instead of a generic one.


## [0.2.2] - 2025-12-21

### Fixed

- Code indentation in PDF output.


## [0.2.1] - 2025-12-07

### Fixed

- Indentation normalised from 2 to 4 spaces.


## [0.2.0] - 2025-12-07

### Changed

- Complete codebase restructuring.
- Overhauled markdown extraction logic (now following the Python logic from the llmmd2pdf project).
- **PDF generation error for long conversations by replacing the Canvas approach with `pdfmake`.**


## [0.1.1] - 2025-12-07

### Added

- HTML DOM copy button.

### Fixed

- PDF metadata error.


## [0.1.0] - 2025-12-07

### Added

- Initial release.
- One-click export of LLM chat conversations to Quarto Markdown (clipboard).
- PDF download via client-side `pdfmake` generation.
- Support for ChatGPT, Claude, and Gemini.
