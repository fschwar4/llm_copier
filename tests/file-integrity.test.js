import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'src');

const manifest = JSON.parse(readFileSync(join(SRC, 'manifest.json'), 'utf-8'));

// ---------------------------------------------------------------------------
// Verify that every file referenced in manifest.json actually exists in src/
// ---------------------------------------------------------------------------

describe('file integrity – icons', () => {
  for (const [size, path] of Object.entries(manifest.icons || {})) {
    it(`icon ${size}px exists: ${path}`, () => {
      assert.ok(existsSync(join(SRC, path)),
        `referenced icon missing: src/${path}`);
    });
  }

  if (manifest.action?.default_icon) {
    for (const [size, path] of Object.entries(manifest.action.default_icon)) {
      it(`action icon ${size}px exists: ${path}`, () => {
        assert.ok(existsSync(join(SRC, path)),
          `referenced action icon missing: src/${path}`);
      });
    }
  }
});

describe('file integrity – popup and pages', () => {
  it('default_popup file exists', () => {
    const popup = manifest.action?.default_popup;
    assert.ok(popup, 'default_popup must be declared');
    assert.ok(existsSync(join(SRC, popup)),
      `popup file missing: src/${popup}`);
  });

  // Dynamically create one test per <script src="..."> found in popup.html.
  // Tests are registered at the describe() level (not nested inside it())
  // to avoid 'cancelledByParent' errors on Node 20.
  const popupHtml = readFileSync(join(SRC, 'popup.html'), 'utf-8');
  const srcPattern = /src="([^"]+)"/g;
  let match;
  while ((match = srcPattern.exec(popupHtml)) !== null) {
    const scriptPath = match[1];
    it(`popup.html script src="${scriptPath}" exists`, () => {
      assert.ok(existsSync(join(SRC, scriptPath)),
        `referenced script missing: src/${scriptPath}`);
    });
  }
});

describe('file integrity – JS module imports', () => {
  // Check that popup.js imports resolve to real files
  it('popup.js imports resolve to existing files', () => {
    const popupJs = readFileSync(join(SRC, 'popup.js'), 'utf-8');
    const importPattern = /from\s+['"](\.[^'"]+)['"]/g;
    let match;
    while ((match = importPattern.exec(popupJs)) !== null) {
      const importPath = match[1];
      const resolved = join(SRC, importPath);
      assert.ok(existsSync(resolved),
        `popup.js imports "${importPath}" but file does not exist`);
    }
  });
});

describe('file integrity – third-party libraries', () => {
  const expectedLibs = [
    'lib/pdfmake.min.js',
    'lib/vfs_fonts.js',
    'lib/highlight.min.js',
  ];

  for (const lib of expectedLibs) {
    it(`library exists: ${lib}`, () => {
      assert.ok(existsSync(join(SRC, lib)),
        `required library missing: src/${lib}`);
    });
  }
});
