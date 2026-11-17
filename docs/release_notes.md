# AMO Release Notes

Release notes as submitted to [addons.mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/llm-markdown-copier/), newest first. AMO does not render Markdown, so each entry is kept as the exact plain text that was pasted. Technical details are in [CHANGELOG.md](../CHANGELOG.md).


## v0.2.15 (2026-11-17)

```text
New
- PDF: Math formulas are now shown as readable text with real superscripts and subscripts (e.g. W m⁻² nm⁻¹) instead of raw LaTeX code. The Markdown export keeps formulas as $…$ / $$…$$, which Quarto renders.

Fixes
- Claude: Exports are complete again. After a recent claude.ai update, the answers were missing.
- Claude: Source links no longer end in an empty box or a "+2" counter.
- ChatGPT: Progress notes ("Checking …") and tool calls no longer appear as separate answers. Each question now has one answer.
- ChatGPT: Citation markers are turned into source links instead of showing up as raw code.
- ChatGPT: Model names are displayed correctly (e.g. "GPT-6 Pro").
- PDF: Bold text, links and code inside tables are now formatted instead of showing ** characters.
- PDF: Symbols the PDF font cannot display (arrows, ⅓, ∝, ✓ …) are replaced with readable text instead of empty boxes.
```
