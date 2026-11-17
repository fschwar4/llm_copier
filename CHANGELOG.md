# Changelog

All notable changes to the LLM Markdown Copier Firefox extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).


## [Unreleased]

### Fixed

- Claude: exports of longer chats could miss messages unless the whole chat had been scrolled through first. claude.ai now renders only the messages near the visible part of the chat and leaves empty placeholders for the others. The export scrolls to each placeholder, collects the messages as they render and then returns to the previous scroll position. If messages still cannot be loaded, the export starts with a note saying how many are missing.
- Gemini: math formulas appeared three times in a row (MathML text with a detached "¨", the raw TeX and the rendered glyphs, e.g. "1125 s\frac{1}{125}\text{ s}1251 s"). Rendered formulas are now exported from their TeX source as `$…$` / `$$…$$` (Gemini `data-math`, otherwise the KaTeX `application/x-tex` annotation, which also covers KaTeX on other sites), so the PDF shows "1/125 s" and Quarto renders them.
- Gemini: source chips ("MDPI + 1") were dropped, so answers had no sources. They become `[title](url)` links at the end of their paragraph. The page has no links for them; the URL is read from the chip's `jslog` metadata (base64 JSON), which only holds the first source of a chip. The chip markup is a `<div>` inside a `<p>`, which `DOMParser` moves out of the paragraph; both layouts are handled.
- Gemini: questions started with the hidden screen-reader label "You said" plus a shortened copy of the question; that label is skipped now. The title is the chat name Gemini shows in the tab ("<name> - Google Gemini"), falling back to the first question.
- Table cells keep inline formatting (bold, links, code, math) in the Markdown export instead of plain text.


## [0.2.15] - 2026-11-17

### Added

- Math formulas in PDF output. LaTeX math (`$…$`, `$$…$$`) is rendered as readable text with Unicode symbols, Greek letters, real superscripts/subscripts, `\frac` as `a/b` and TeX-like spacing (`src/latex2text.js`). ChatGPT's `\(…\)` / `\[…\]` delimiters are converted to `$…$` / `$$…$$`, so the Markdown export also renders in Quarto.

### Fixed

- Claude exports were missing the answers after the claude.ai DOM change. Answers are now read from `data-testid="assistant-message"`; citation chips become `[source](url)` links without the "+N" counter and without the icon-font glyph that printed as an empty box; the model name no longer includes the effort badge; the PDF title no longer ends in " - Claude".
- ChatGPT exports showed progress notes ("Ich prüfe …") and tool calls as separate answers. They are skipped now, and each question gets a single "Answer" heading. Citation markers (`genui{"citation":…}`) become source links or are removed. Model names read "GPT-6 Pro" instead of "Gpt 6 Pro", and `&#x20;` entities in questions are decoded.
- PDF: bold text, links and inline code inside table cells and inside bold/italic text rendered as literal `**`; they are now formatted. Characters the bundled Roboto font lacks (arrows, ⅓, ∝, ✓ …) are replaced with readable text instead of printing as empty boxes (`src/glyphs.js`). A stray `\newpage` marker is removed, and an escaped `\$` prints as `$`.


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
