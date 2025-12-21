# LLM Markdown Copier Firefox Extension

**LLM Markdown Copier** is a secure and lightweight Firefox extension that lets you export chat sessions from large language model (LLM) web apps as clean, shareable Markdown, portable PDF documents or raw HTML document object model ([DOM](https://en.wikipedia.org/wiki/Document_Object_Model)). It currently supports OpenAI ChatGPT ([`chatgpt.com`](https://chatgpt.com)), Anthropic Claude ([`claude.ai`](https://claude.ai)) and Google Gemini ([`gemini.google.com`](https://gemini.google.com)). **The extension is intentionally simple: everything happens entirely in your browser and nothing is ever sent to any server.**

## Features

<p align="center">
  <a href="./extension_popup.png" target="_blank" rel="noopener noreferrer" style="display:inline-block;vertical-align:middle;">
    <img src="./extension_popup.png" alt="Extension popup screenshot" width="240" style="vertical-align:middle;" />
  </a>
  &nbsp;&nbsp;
  <a href="./settings_page.png" target="_blank" rel="noopener noreferrer" style="display:inline-block;vertical-align:middle;">
    <img src="./settings_page.png" alt="Settings page screenshot" width="240" style="vertical-align:middle;" />
  </a>
</p>

- **One‑click export to Markdown.** Convert the currently open chat into a structured Markdown document with a [Quarto](https://quarto.org/) YAML header. The exported text is copied directly to your clipboard.

- **Full HTML DOM capture.** Need the raw page source for debugging or archival purposes? A third button allows you to copy the complete HTML document to your clipboard.

- **High‑quality PDF downloads.** Generate a PDF from your conversation using `pdfmake`, a client-side PDF generation library. **No Canvas Approach!** Leading to high quality pdf generation even for long conversations. The PDF is directly build based on the extracted Markdown content.

- **PDF Layout Customization.** You can customize the PDF output layout (font size, margin size, color scheme) in the extension settings page.

- **Syntax Highlighting for code blocks.** The PDF export includes syntax highlighting for code snippets using [`highlight.js`](https://highlightjs.org/). See below for a full list of supported languages.
- **Minimal permissions.** The extension uses the `activeTab` permission to execute scripts in the currently active tab only in response to a user action (clicking the extension button), the `clipboardWrite` permission to copy exported content to the clipboard, and the `storage` permission to save custom settings. It does not read from your clipboard or access unrelated browsing data. **Host permissions are restricted to the ChatGPT, Claude, and Gemini domains only.**

- **Open source.** Open source license (AGPL-3.0) You can inspect the code or build it yourself from the [GitHub repository](https://github.com/fschwar4/llm_copier).

> **🔒 100% client‑side.**  
> All data extraction and conversion happen in your browser — no requests to external servers, no telemetry, and no tracking.

### Supported Languages for Syntax Highlighting

Language detection is automatic when no language is specified in the code fence.
PDF export includes syntax highlighting for the following languages:

**General Purpose:** C, C++, C#, Go, Java, JavaScript, Kotlin, Lua, Objective-C, Perl, PHP, Python, R, Ruby, Rust, Swift, TypeScript, VB.NET  
**Scientific/Statistical:** Julia, Mathematica, MATLAB, SAS  
**Web Technologies:** CSS, GraphQL, HTML/XML, HTTP, JSON, Less, SCSS, PHP Template, WASM  
**Shell/Scripting:** Bash, PowerShell, Shell  
**Database:** PgSQL, SQL  
**Configuration/Markup:** AsciiDoc, Dockerfile, INI, LaTeX, Makefile, Markdown, YAML, CMake, Oxygen    
**Assembly**: armasm, avrasm, llvm, mipsasm, smali, x86asm  
**Other:** Diff, Plaintext, Python REPL, Julia REPL


## Roadmap

- [x] Fix: Code indentation in PDF output
- [ ] Restructure directory layout (images)
- [ ] Add support for additional LLM web apps
- [ ] Decision about Emoji and special character support
  - [ ] would increase file size significantly (as embedded fonts are needed)
- [ ] Find solution to export multiple conversation paths at once (re-iterated questions / branches)
  - [ ] Think about export of artifacts (images, files) as well (one zip file?)
- [x] Add: Style Setting Page for PDF output (font size, margin size, color scheme)

## Contributing

Contributions are welcome! Feel free to open issues or pull requests to improve model detection for additional providers, enhance the PDF layout or optimise performance on extremely long conversations.

This project built upon the following projects:

- [pdfmake](http://pdfmake.org/#/) for PDF generation \[[MIT License](https://github.com/bpampuch/pdfmake)\].
- [highlight.js](https://highlightjs.org/) for code syntax highlighting \[[BSD-3-Clause License](https://github.com/highlightjs/highlight.js)\].
