# LLM Markdown Copier Firefox Extension

**LLM Markdown Copier** is a lightweight Firefox extension that lets you export 
chat sessions from large language model (LLM) web apps as clean, shareable 
Markdown, portable PDF documents or raw HTML.  It currently supports OpenAI 
ChatGPT ([`chatgpt.com`](https://chatgpt.com)), Anthropic Claude ([`claude.ai`](https://claude.ai)) and Google Gemini ([`gemini.google.com`](https://gemini.google.com)).  
The extension is intentionally simple: everything happens entirely in your 
browser and nothing is ever sent to any server.

## Features

![Popup Screenshot](./screenshot.png)

- **One‑click export to Markdown.**  Convert the currently open chat into a
  structured Markdown document with a [Quarto](https://quarto.org/) YAML header.  
  The exported text is copied directly to your clipboard.
- **High‑quality PDF downloads.**  Generate a PDF from your conversation using 
  an embedded copy of `html2pdf`.  
  Long conversations are split into chunks to avoid canvas limitations. However, 
  for very long conversations, consider using the companion project [llmmd2pdf](https://github.com/fschwar4/llmmd2pdf) 
  as described below.
- **Full DOM capture.**  Need the raw page source for debugging or archival
  purposes?  A third button allows you to copy the complete HTML document to 
  your clipboard.
- **Minimal permissions.**  It uses the `activeTab` permission to execute
  scripts in the current tab only when you click the extension button, and
  the `clipboardWrite` permission to copy exported text. It does not read
  your clipboard or access other browsing data. The permissions are limited to 
  the ChatGPT, Claude and Gemini domains only.  
- **Lightweight and open source.**  The extension is small (under 300KB) and 
  open source under the permissive MIT license.  You can inspect the code or 
  build it yourself from the [GitHub repository](https://github.com/fschwar4/llm_copier).

<div role="note" style="background: #f0fff7ff;border-left:4px solid #1fd24bff;padding:12px;border-radius:6px;margin:1em 0">
  <strong>100&nbsp;% client‑side.</strong></br>
  All data extraction and conversion happens in the browser. There are no external requests, no telemetry and no tracking.
</div>


## High Quality Export (Long Conversations)

For very long recordings, the client-side PDF conversion in this extension may 
lose resolution or hit browser memory limits. 

For **high-quality PDFs** of long conversations, we recommend using the companion project:
**[llmmd2pdf](https://github.com/fschwar4/llmmd2pdf)**

Both projects share aligned APIs. You can use the "Copy Full DOM" button in this 
extension to extract the raw data needed for `llmmd2pdf` or other processing tools.

## Roadmap

- [x] Fix model detection code (URL-based detection)
- [ ] Fix complete Quarto Yaml Header
  - [ ] execution
  - [ ] pdf layout
- [ ] Fix issue long recordings
- [x] Add copying the complete DOM to clipboard as extra button

## Contributing

Contributions are welcome!  Feel free to open issues or pull requests to
improve model detection for additional providers, enhance the PDF layout or
optimise performance on extremely long conversations.
