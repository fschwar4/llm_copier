/**
 * Readable stand-ins for characters the PDF font cannot show.
 *
 * The PDF uses the bundled Roboto font. It has no arrows, check marks,
 * geometric shapes, several math symbols and some fractions; pdfmake prints
 * those as empty boxes. They are replaced with characters Roboto does have.
 * Private-use characters (icon-font glyphs) are dropped.
 *
 * Coverage was checked against all four bundled Roboto variants. Characters
 * Roboto does have (≈ ≤ ≥ ≠ ± × · √ ∞ ∑ ¼ ½ ¾ ⅛ …, zero-width space) are
 * not listed and pass through unchanged.
 */

export const FALLBACKS = {
  // invisible / spacing
  '‌': '', '‍': '', '⁠': '', ' ': ' ', '‒': '–',
  // arrows
  '→': '->', '⟶': '->', '↗': '->', '↘': '->', '←': '<-', '⟵': '<-', '↵': '<-',
  '↔': '<->', '⟷': '<->', '⇒': '=>', '⟹': '=>', '⇐': '<=', '⇔': '<=>', '⟺': '<=>',
  '↑': '^', '↓': 'v',
  // math
  '∝': '~', '∼': '~', '≅': '≈', '≡': '=', '≪': '<<', '≫': '>>', '∓': '-/+',
  '∅': 'Ø', '⌀': 'Ø', '∥': '||', '‖': '||', '∈': 'in', '∉': 'not in', '∘': '°',
  // fractions missing in Roboto (¼ ½ ¾ ⅛ ⅜ ⅝ ⅞ are present)
  '⅓': '1/3', '⅔': '2/3', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6', '⅚': '5/6',
  // marks and shapes
  '✓': '√', '✔': '√', '✗': '×', '✘': '×', '★': '*', '☆': '*', '⚠': '(!)',
  '▲': '^', '△': '^', '▼': 'v', '▽': 'v', '►': '>', '▶': '>', '◀': '<',
  '●': '•', '■': '•', '▪': '•', '◆': '•', '○': 'o', '◦': '·', '∙': '·', '‣': '•', '⁃': '-',
  '℃': '°C', '℉': '°F'
};

const MISSING = new RegExp(`(\\d?)([${Object.keys(FALLBACKS).join('')}])|[\\uE000-\\uF8FF]`, 'gu');
const FRACTION = /^\d\/\d$/;

/** Replace characters missing from the PDF font; "8⅓" becomes "8 1/3". */
export function replaceMissingGlyphs(text) {
  return String(text).replace(MISSING, (match, digit, ch) => {
    if (!ch) return ''; // private-use icon glyph
    const sub = FALLBACKS[ch];
    if (!digit) return sub;
    return digit + (FRACTION.test(sub) ? ' ' : '') + sub;
  });
}
