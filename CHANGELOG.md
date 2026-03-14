# Changelog

All notable changes to the LLM Markdown Copier Firefox extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).


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
