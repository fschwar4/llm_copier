import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FALLBACKS, replaceMissingGlyphs } from '../src/glyphs.js';
import { latexToPdfText } from '../src/latex2text.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const vfs = readFileSync(join(__dirname, '..', 'src', 'lib', 'vfs_fonts.js'), 'utf-8');
const FONTS = ['Roboto-Regular.ttf', 'Roboto-Medium.ttf', 'Roboto-Italic.ttf', 'Roboto-MediumItalic.ttf'];

/** Code points mapped by a TrueType font's cmap table (formats 4 and 12). */
function coveredCodePoints(fontName) {
  const match = vfs.match(new RegExp(`"${fontName.replace('.', '\\.')}"\\s*:\\s*"([^"]+)"`));
  assert.ok(match, `${fontName} not found in vfs_fonts.js`);
  const buf = Buffer.from(match[1], 'base64');
  let cmap = -1;
  for (let t = 0; t < buf.readUInt16BE(4); t++) {
    const rec = 12 + t * 16;
    if (buf.toString('ascii', rec, rec + 4) === 'cmap') cmap = buf.readUInt32BE(rec + 8);
  }
  const covered = new Set();
  for (let s = 0; s < buf.readUInt16BE(cmap + 2); s++) {
    const off = cmap + buf.readUInt32BE(cmap + 4 + s * 8 + 4);
    const format = buf.readUInt16BE(off);
    if (format === 4) {
      const segX2 = buf.readUInt16BE(off + 6);
      const ends = off + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
      for (let k = 0; k < segX2 / 2; k++) {
        const end = buf.readUInt16BE(ends + 2 * k), start = buf.readUInt16BE(starts + 2 * k);
        const delta = buf.readInt16BE(deltas + 2 * k), range = buf.readUInt16BE(ranges + 2 * k);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let glyph = range === 0
            ? (c + delta) & 0xffff
            : buf.readUInt16BE(ranges + 2 * k + range + 2 * (c - start));
          if (range !== 0 && glyph) glyph = (glyph + delta) & 0xffff;
          if (glyph) covered.add(c);
        }
      }
    } else if (format === 12) {
      for (let g = 0; g < buf.readUInt32BE(off + 12); g++) {
        const rec = off + 16 + g * 12;
        for (let c = buf.readUInt32BE(rec); c <= buf.readUInt32BE(rec + 4); c++) covered.add(c);
      }
    }
  }
  return covered;
}

const coverage = FONTS.map(name => [name, coveredCodePoints(name)]);
const missingIn = (text) => coverage
  .flatMap(([name, set]) => [...text].filter(ch => !set.has(ch.codePointAt(0))).map(ch => `${ch} (U+${ch.codePointAt(0).toString(16)}) in ${name}`));

describe('PDF glyph fallbacks', () => {
  it('replacements only use characters the bundled Roboto fonts contain', () => {
    assert.deepEqual(missingIn(Object.values(FALLBACKS).join('')), []);
  });

  it('every replaced character is really missing from Roboto', () => {
    const present = Object.keys(FALLBACKS).filter(ch => !missingIn(ch).length);
    assert.deepEqual(present, []);
  });

  it('math output only uses characters Roboto contains', () => {
    const tex = String.raw`\alpha\beta\gamma\delta\epsilon\theta\lambda\mu\pi\rho\sigma\tau\phi\omega\Delta\Sigma\Omega
      \times\cdot\div\pm\mp\approx\neq\le\ge\sim\to\Rightarrow\iff\in\infty\partial\sum\prod\int\sqrt{x}
      \ldots\prime\degree\hbar\ell\neg\Vert\,\quad x^2_i`;
    const text = latexToPdfText(tex).map(p => p.text).join('');
    assert.deepEqual(missingIn(text.replace(/\n/g, '')), []);
  });

  it('replaces missing characters with readable text', () => {
    assert.equal(replaceMissingGlyphs('nur 8⅓ Stufen, ⅔ davon'), 'nur 8 1/3 Stufen, 2/3 davon');
    assert.equal(replaceMissingGlyphs('(∝ λ⁻⁴), A → B ⇒ C, Ø 50 mm, 25 ℃'), '(~ λ⁻⁴), A -> B => C, Ø 50 mm, 25 °C');
    assert.equal(replaceMissingGlyphs('✓ ja, ✗ nein, 10 ≈ 9'), '√ ja, × nein, 10 ≈ 9');
  });

  it('drops icon-font glyphs (private use area)', () => {
    assert.equal(replaceMissingGlyphs('bhphotovideo'), 'bhphotovideo');
  });
});
