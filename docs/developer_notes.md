# Firefox Extension Release Checklist

Note: Personal checklist for releasing new versions of the LLM Markdown Copier Firefox extension. Tailored to my macOS workflow.

## Phase 1: Local Development & Build

**1. Update Version Number**

  * [ ] Update the **version number** in `src/manifest.json`.


**2. Functionality Testing (Temporary Extension mode)**

Go to [`about:debugging#/runtime/this-firefox`](about:debugging#/runtime/this-firefox) to load the temporary extension.

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


**3. Run Tests**

  * [ ] Run `npm test` and ensure all tests pass.

  This runs the test suite defined in `tests/` using the Node.js built-in test runner (no dependencies required). The tests validate:

  * **Manifest compatibility** (`tests/manifest.test.js`):
    * Required fields, Manifest V3, valid version string.
    * All required permissions and host permissions are declared.
    * Firefox Gecko settings: extension ID, `strict_min_version` format.
    * ESR compatibility guard: `strict_min_version` must be between `109` (MV3 baseline) and the current Firefox ESR version. This prevents the bug from [GitHub issue #1](https://github.com/fschwar4/llm_copier/issues/1).

  * **File integrity** (`tests/file-integrity.test.js`):
    * All icons referenced in `manifest.json` exist on disk.
    * `popup.html` and all `<script src="...">` it references exist.
    * All ES module imports in `popup.js` resolve to real files.
    * Third-party libraries (`pdfmake`, `vfs_fonts`, `highlight.js`) exist in `src/lib/`.

  > **Maintenance note:** When Mozilla ships a new ESR branch, update the `CURRENT_ESR_VERSION` constant at the top of `tests/manifest.test.js`.

  * [ ] *(Optional)* Run Mozilla's `web-ext lint` locally to validate the manifest against Mozilla's official schema (same check that runs in CI):

```bash
# One-time install:
npm install --global web-ext

# Lint (and save output to file):
web-ext lint --source-dir=src 2>&1 | tee docs/web-ext-lint.txt
```

  > This catches deprecated APIs, CSP issues, and manifest schema errors that AMO reviewers would flag. The same check runs automatically in GitHub Actions CI, so local runs are optional.

  **Known warnings (9 total — all safe to ignore):**

  | # | Code | Source | Why it's safe |
  |---|------|--------|---------------|
  | 1 | `KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION` | `manifest.json` | `data_collection_permissions` was introduced in Firefox 140, but `strict_min_version` is `109`. Older Firefox versions simply ignore unknown manifest keys — no functional impact. |
  | 2 | `KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION` | `manifest.json` | Same field, but for Firefox for Android (introduced in 142). Also silently ignored on older versions. |
  | 3 | `UNSAFE_VAR_ASSIGNMENT` (innerHTML) | `lib/highlight.min.js` | Third-party library. Core to how highlight.js applies syntax highlighting to DOM elements. |
  | 4–9 | `DANGEROUS_EVAL` (×6) | `lib/highlight.min.js`, `lib/pdfmake.min.js` | Third-party libraries. Used internally for regex grammar engines (highlight.js) and virtual filesystem / font loading (pdfmake). |


**4. Version Control & Documentation**

  * [ ] Check if `README.md` requires updates
    * [ ] Features list
    * [ ] Roadmap section
    * [ ] Repository tree structure (`tree . | pbcopy`)
  * [ ] Check if screenshots need updating based on UI changes.


**5. Build Distribution**

  * [ ] Run the build script to create a clean, versioned ZIP in `dist/`:

```bash
./scripts/build.sh
```

  This script automatically:
  1. Reads the version from `src/manifest.json`.
  2. Zips the contents of `src/` (excluding `.DS_Store` files).
  3. Strips any remaining macOS metadata (`__MACOSX/`).
  4. Outputs `dist/llm_copier-v<version>.zip` (e.g. `llm_copier-v0.1.3.zip`).


**6. Commit Changes**

  * [ ] Commit changes to Git with a new **Version Tag**.


---
---

## Phase 2: Firefox Extension Management

> **CI note:** When you push to `main` or open a PR, GitHub Actions automatically runs both `npm test` and `web-ext lint` (see `.github/workflows/ci.yml`). Check that CI passes before submitting to AMO.

**7. Submission Process**

  * [ ] Upload the new `dist` ZIP file to the [Developer Hub](https://addons.mozilla.org/en-US/developers/).
  * [ ] **Validation:** Accept warnings (currently 9 warnings expected — see known warnings in step 3).
  * [ ] Add the **Release Notes**.
    * [ ] Save the release notes locally for documentation.


**8. Reviewer Context**

  * [ ] **Add Reviewer Statement:** Paste the following standard explanation regarding library warnings:

> "No warning applies to my own code.
> The two manifest key warnings (`KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION`, `KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION`) are caused by the `data_collection_permissions` field, which was introduced in Firefox 140. The extension sets `strict_min_version` to `109.0` to maintain compatibility with Firefox ESR. Older Firefox versions simply ignore the unrecognised key — there is no functional impact.
> The remaining warnings are due to my use of the `pdfmake` package ([https://github.com/bpampuch/pdfmake](https://github.com/bpampuch/pdfmake)) and the `highlight.js` package ([https://github.com/highlightjs/highlight.js](https://github.com/highlightjs/highlight.js)). Given that these are long-standing and widely adopted libraries, I believe these warnings do not reflect any significant security risks."


**9. Store Listing Updates**

  * [ ] **Description:** If necessary, update the extension description.
  * [ ] **Visuals:** If necessary, upload new screenshots.
  * [ ] **Permission Changes:** If necessary, update the permissions section.
