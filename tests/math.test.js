import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { latexToPdfText, latexToPlainText } from '../src/latex2text.js';
import { normalizeMathDelimiters } from '../src/extractors.js';

// latexToPlainText writes superscripts as ^x and subscripts as _x.
//   is the thin space produced by "\,".

describe('LaTeX math → readable PDF text', () => {
  const cases = [
    [
      'ChatGPT display formula',
      String.raw`E_\text{Unterwuchs}
\approx 0{,}25\,\mathrm{lx}\times 0{,}02
=0{,}005\,\mathrm{lx}
=5\,\mathrm{Millilux}.`,
      'E_Unterwuchs ≈ 0,25 lx × 0,02 = 0,005 lx = 5 Millilux.'
    ],
    [
      'percent and explicit spaces',
      String.raw`0{,}25\ \mathrm{lx}\times 2\,\%=0{,}005\ \mathrm{lx}`,
      '0,25 lx × 2 % = 0,005 lx'
    ],
    [
      'unit with negative exponents',
      String.raw`\mathrm{W\,m^{-2}\,nm^{-1}}`,
      'W m^−2 nm^−1'
    ],
    [
      'fraction, root, unary minus',
      String.raw`x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}`,
      'x = (−b ± √(b^2 − 4ac))/(2a)'
    ],
    [
      'degree sign, Greek, arrow fallback',
      String.raw`T = 25\,^\circ\mathrm{C},\quad \Delta t \to 0`,
      'T = 25 °C, Δt -> 0'
    ],
    [
      'big operator with limits',
      String.raw`\sum_{i=1}^{n} x_i^2 \le \infty`,
      '∑_i=1^n x_i^2 ≤ ∞'
    ],
    [
      'functions and sets',
      String.raw`\sin(\theta) + \log_{10} x,\; x \in [0,1]`,
      'sin(θ) + log_10 x, x in [0,1]'
    ],
    [
      'aligned environment',
      String.raw`\begin{aligned} a &= b \\ c &= -d \end{aligned}`,
      'a = b\nc = −d'
    ],
    [
      'umlauts in \\text',
      String.raw`\text{Gr\"o\ss e} = 1{.}5\,\text{m}`,
      'Größe = 1.5 m'
    ],
    [
      'Gemini: fractions and \\text with a leading space',
      String.raw`\frac{1}{125}\text{ s} \times 1000 = \frac{1000}{125} = 8\text{ Sekunden}`,
      '1/125 s × 1000 = 1000/125 = 8 Sekunden'
    ],
    [
      'Gemini: \\text in an exponent',
      String.raw`\text{Neue Belichtungszeit} = \text{Ursprüngliche Zeit} \times 2^{\text{Anzahl der Blendenstufen}}`,
      'Neue Belichtungszeit = Ursprüngliche Zeit × 2^Anzahl der Blendenstufen'
    ]
  ];

  for (const [name, tex, expected] of cases) {
    it(name, () => assert.equal(latexToPlainText(tex), expected));
  }

  it('uses pdfmake sup/sub and italic variables', () => {
    assert.deepEqual(latexToPdfText('x^{2}_i'), [
      { text: 'x', italics: true },
      { text: '2', sup: true },
      { text: 'i', italics: true, sub: true }
    ]);
  });
});

describe('ChatGPT math delimiters → Pandoc/Quarto', () => {
  it('converts \\( … \\) to $ … $', () => {
    assert.equal(normalizeMathDelimiters(String.raw`in \( \mathrm{W\,m^{-2}} \), und`), String.raw`in $\mathrm{W\,m^{-2}}$, und`);
  });

  it('converts \\[ … \\] to $$ … $$, keeping the line layout', () => {
    assert.equal(normalizeMathDelimiters('ergibt sich:\n\n\\[\nE = mc^2\n\\]\n\nWeiter'), 'ergibt sich:\n\n$$\nE = mc^2\n$$\n\nWeiter');
  });

  it('leaves code untouched', () => {
    const md = 'Inline `\\(x\\)` und\n```js\nconst re = /\\[a\\]/; // \\(b\\)\n```\n';
    assert.equal(normalizeMathDelimiters(md), md);
  });
});
