# LLM Markdown Copier

**LLM Markdown Copier** is a lightweight Firefox extension that lets you export your
active chat sessions from popular large language model (LLM) providers as
clean, shareable Markdown or portable PDF documents.  It currently supports
OpenAI ChatGPT (`chatgpt.com`), Anthropic Claude (`claude.ai`) and Google
Gemini (`gemini.google.com`).  The extension is intentionally simple:
everything happens entirely in your browser and nothing is ever sent to a
server.

## Features

* **One‑click export to Markdown.**  Convert the currently open chat into a
  structured Markdown document with a YAML front matter and logical
  separators.  The exported text is copied directly to your clipboard.
* **High‑quality PDF downloads.**  Generate a PDF from your conversation
  using an embedded copy of `html2pdf`.  Long conversations are split into
  chunks to avoid canvas limitations and preserve readability.
* **Full DOM capture.**  Need the raw page source for debugging or archival
  purposes?  A third button allows you to copy the complete document
  (equivalent to `document.documentElement.outerHTML`) to your clipboard.
* **Model & company detection.**  The extension inspects the current tab’s
  domain to determine the platform, LLM model and provider.  This
  information populates the YAML header of your Markdown export and the
  metadata in the generated PDF (e.g. `ChatGPT (OpenAI)` vs `Claude (Anthropic)`).
* **100 % client‑side.**  All data extraction and conversion happens in the
  browser.  There are no external requests, no telemetry and no tracking.

## Installation

1. Clone or download this repository and open the directory in Firefox via
   `about:debugging#/runtime/this-firefox`.  Click **“Load Temporary
   Add‑on…”** and select the `manifest.json` file.  Alternatively you can
   install a packaged `.xpi` from the [Releases](https://github.com/fschwar4/llm_copier/releases) page once
   available.
2. Ensure the extension has permission to run on the LLM domains you use.
   The manifest includes host permissions for ChatGPT, Claude and Gemini by
   default.  Additional domains can be added if needed.

## Usage

1. Navigate to your chat at **chatgpt.com**, **claude.ai** or
   **gemini.google.com** and start a conversation.
2. Click the **LLM Markdown Copier** toolbar button.  A small pop‑up will
   appear with three buttons:
   
   * **Copy Markdown** – Extracts the conversation into clean Markdown with a
     YAML front matter (including title, date, model and company) and copies
     it to your clipboard.
   * **Save as PDF** – Generates a PDF from the conversation.  Longer
     conversations are paginated safely and include a header showing the
     title, date and export source.
   * **Copy Full DOM** – Copies the entire page’s HTML to your clipboard.

3. Paste the copied Markdown or DOM wherever you like, or open the
   downloaded PDF for a neatly formatted archive.

## Security and Privacy

* **No server–side processing.**  The extension works entirely in your
  browser context.  It reads the content of the current tab, converts it to
  Markdown or PDF and writes it to the clipboard or to disk.  There are no
  hidden network requests and no analytics.
* **Minimal permissions.**  It uses the `activeTab` permission to execute
  scripts in the current tab only when you click the extension button, and
  the `clipboardWrite` permission to copy exported text.  It does not read
  your clipboard or access other browsing data.
* **Open source.**  You can inspect every file in this repository to verify
  how your data is handled.  The conversion library `html2pdf` is bundled
  locally to avoid loading scripts from third‑party CDNs.

## Relationship to `llmmd2pdf`

This project is designed to complement the separate
[`llmmd2pdf`](https://github.com/fschwar4/llmmd2pdf) project.  While
LLM Markdown Copier focuses on quick, client‑side exports straight from your
browser, **llmmd2pdf** accepts Markdown generated from long LLM conversations
and produces high‑quality PDFs using a more powerful pipeline (e.g. via
Quarto and Pandoc).  Both tools share a consistent API and YAML header
format, making it straightforward to copy your Markdown from this
extension and feed it into `llmmd2pdf` when you need professional
typesetting or better control over the layout.

## Screenshot

<!-- TODO: Insert an actual screenshot of the popup once available.  The image
should show the three buttons (Copy Markdown, Save as PDF, Copy Full DOM)
and the status area below them.  Replace `popup-screenshot.png` with the
filename of your screenshot. -->

![LLM Copier popup screenshot](popup-screenshot.png)

## Contributing

Contributions are welcome!  Feel free to open issues or pull requests to
improve model detection for additional providers, enhance the PDF layout or
optimise performance on extremely long conversations.