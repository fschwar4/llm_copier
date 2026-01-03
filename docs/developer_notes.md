# Firefox Extension Release Checklist

Note: Personal checklist for releasing new versions of the LLM Markdown Copier Firefox extension. Tailored to my macOS workflow.

## Phase 1: Local Development & Build

**1. Functionality Testing (Temporary Extension mode)**

Go to `about:debugging#/runtime/this-firefox` to load the temporary extension.

* **LLM Integration Check:** Verify that the extension works correctly with all supported models:
  
  * [ ] ChatGPT
  * [ ] Gemini
  * [ ] Claude


* **Regression Testing:** Double-check that core features remain unbroken:

  * [ ] PDF titles are detected/extracted correctly.
  * [ ] Code syntax highlighting renders correctly.
  * [ ] Table formatting is preserved.


* **UI/UX Settings:** Ensure layout configurations persist:

  * [ ] Change **all** settings to custom values and verify effects.
  * [ ] Perform a "Reset to Default" and verify the restoration.


**2. Version Control & Documentation**

  * [ ] Update the **version number** in `manifest.json`.
  * [ ] Check if `README.md` requires updates
    * [ ] Features list
    * [ ] Roadmap section
    * [ ] Repository tree structure (`tree . | pbcopy`)
  * [ ] Check if screenshots need updating based on UI changes.

**3. Build Distribution**

  * [ ] Create the new distribution ZIP file.
  * [ ] **Clean Build Artifacts:** Remove OS-specific metadata (macOS) from the ZIP.

```bash
zip -d llm_copier.zip "__MACOSX/*" "*.DS_Store" "*/.DS_Store"
```

**4. Commit Changes**

  * [ ] Commit changes to Git with a new **Version Tag**.


---
---

## Phase 2: Firefox Extension Management

**5. Submission Process**

  * [ ] Upload the new `dist` ZIP file to the Developer Hub.
  * [ ] **Validation:** Accept warnings related to third-party libraries (currently 7 warnings expected).
  * [ ] Add the **Release Notes**.
    * [ ] Save the release notes locally for documentation.


**6. Reviewer Context**

  * [ ] **Add Reviewer Statement:** Paste the following standard explanation regarding library warnings:

> "No warning applies to my own code.  
> The warnings reported during the review are due to my use of the `pdfmake` package ([https://github.com/bpampuch/pdfmake](https://github.com/bpampuch/pdfmake)). Given that this is a long-standing and widely adopted library, I believe these warnings do not reflect any significant security risks.  
> The same holds true for the `highlight.js` package."


**7. Store Listing Updates**

  * [ ] **Description:** If necessary, update the extension description.
  * [ ] **Visuals:** If necessary, upload new screenshots.
  * [ ] **Permission Changes:** If necessary, update the permissions section.
