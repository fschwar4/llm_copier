/**
 * LaTeX math → pdfmake inline text.
 *
 * The PDF has no math typesetting, so formulas are rendered as readable text:
 * symbols become Unicode characters, ^ and _ become pdfmake superscripts and
 * subscripts, \frac{a}{b} becomes a/b, and spaces are put around relations
 * and operators the way TeX does. Only glyphs contained in the bundled Roboto
 * font are used; arrows and set symbols (missing in Roboto) fall back to ASCII
 * or to the command name.
 *
 * No DOM or pdfmake dependency, so it can be unit-tested in Node.
 */

const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ',
  eta: 'η', theta: 'θ', vartheta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν',
  xi: 'ξ', pi: 'π', varpi: 'π', rho: 'ρ', varrho: 'ρ', sigma: 'σ', varsigma: 'ς', tau: 'τ',
  upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ',
  Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω'
};

// [text, kind]; kind drives the spacing (see needsSpace).
const SYMBOLS = {
  // ordinary
  infty: ['∞', 'ord'], partial: ['∂', 'ord'], ell: ['ℓ', 'ord'], hbar: ['ħ', 'ord'],
  degree: ['°', 'ord'], circ: ['°', 'ord'], prime: ['′', 'ord'], neg: ['¬', 'ord'], lnot: ['¬', 'ord'],
  ldots: ['…', 'ord'], dots: ['…', 'ord'], cdots: ['…', 'ord'], dotsc: ['…', 'ord'],
  dotsb: ['…', 'ord'], vdots: ['…', 'ord'], ddots: ['…', 'ord'], ss: ['ß', 'ord'],
  vert: ['|', 'ord'], lvert: ['|', 'open'], rvert: ['|', 'close'], Vert: ['||', 'ord'],
  lbrace: ['{', 'open'], rbrace: ['}', 'close'], langle: ['<', 'open'], rangle: ['>', 'close'],
  lfloor: ['[', 'open'], rfloor: [']', 'close'], lceil: ['[', 'open'], rceil: [']', 'close'],
  // binary operators
  times: ['×', 'bin'], cdot: ['·', 'bin'], div: ['÷', 'bin'], pm: ['±', 'bin'], mp: ['−/+', 'bin'],
  ast: ['*', 'bin'], star: ['*', 'bin'], bullet: ['•', 'bin'], setminus: ['\\', 'bin'],
  // relations (no arrows in Roboto → ASCII)
  approx: ['≈', 'rel'], simeq: ['≈', 'rel'], approxeq: ['≈', 'rel'], sim: ['~', 'rel'],
  propto: ['~', 'rel'], neq: ['≠', 'rel'], ne: ['≠', 'rel'],
  le: ['≤', 'rel'], leq: ['≤', 'rel'], leqslant: ['≤', 'rel'],
  ge: ['≥', 'rel'], geq: ['≥', 'rel'], geqslant: ['≥', 'rel'],
  ll: ['<<', 'rel'], gg: ['>>', 'rel'], mid: ['|', 'rel'], parallel: ['||', 'rel'], colon: [':', 'rel'],
  to: ['->', 'rel'], rightarrow: ['->', 'rel'], longrightarrow: ['->', 'rel'],
  gets: ['<-', 'rel'], leftarrow: ['<-', 'rel'], longleftarrow: ['<-', 'rel'],
  leftrightarrow: ['<->', 'rel'], longleftrightarrow: ['<->', 'rel'],
  Rightarrow: ['=>', 'rel'], Longrightarrow: ['=>', 'rel'], implies: ['=>', 'rel'],
  Leftarrow: ['<==', 'rel'], Longleftarrow: ['<==', 'rel'], impliedby: ['<==', 'rel'],
  Leftrightarrow: ['<=>', 'rel'], Longleftrightarrow: ['<=>', 'rel'], iff: ['<=>', 'rel'],
  mapsto: ['|->', 'rel'], in: ['in', 'rel'], notin: ['not in', 'rel'],
  // big operators
  sum: ['∑', 'op'], prod: ['∏', 'op'], int: ['∫', 'op'], iint: ['∫∫', 'op'], iiint: ['∫∫∫', 'op'],
  oint: ['∫', 'op']
};

const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
  'coth', 'log', 'ln', 'lg', 'exp', 'lim', 'liminf', 'limsup', 'max', 'min', 'sup', 'inf', 'det',
  'dim', 'ker', 'arg', 'deg', 'gcd', 'lcm', 'Pr', 'hom', 'mod', 'bmod'
]);

const SPACES = {
  ',': ' ', thinspace: ' ', ':': ' ', '>': ' ', ';': ' ', ' ': ' ', enspace: ' ',
  medspace: ' ', thickspace: ' ', quad: ' ', qquad: '  '
};

const IGNORED = new Set([
  'left', 'right', 'middle', 'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr', 'Bigl', 'Bigr',
  'biggl', 'biggr', 'Biggl', 'Biggr', 'displaystyle', 'textstyle', 'scriptstyle',
  'scriptscriptstyle', 'limits', 'nolimits', 'nonumber', 'notag', 'allowbreak', '!'
]);

// Commands whose argument is shown in a different style.
const TEXT_STYLES = {
  text: { text: true, upright: true }, textrm: { text: true, upright: true },
  textnormal: { text: true, upright: true }, textup: { text: true, upright: true },
  textsf: { text: true, upright: true }, texttt: { text: true, upright: true },
  textmd: { text: true, upright: true }, mbox: { text: true, upright: true },
  hbox: { text: true, upright: true },
  textbf: { text: true, upright: true, bold: true },
  textit: { text: true, upright: true, italic: true }, emph: { text: true, upright: true, italic: true },
  textsl: { text: true, upright: true, italic: true },
  mathrm: { upright: true }, mathsf: { upright: true }, mathtt: { upright: true },
  mathbb: { upright: true }, mathcal: { upright: true }, mathfrak: { upright: true },
  mathscr: { upright: true },
  mathbf: { upright: true, bold: true }, boldsymbol: { bold: true }, bm: { bold: true },
  pmb: { bold: true }, mathit: { upright: false, italic: true }
};

// Decorations that are dropped; only the argument is shown.
const ACCENTS = new Set([
  'hat', 'widehat', 'bar', 'overline', 'underline', 'vec', 'overrightarrow', 'tilde', 'widetilde',
  'dot', 'ddot', 'acute', 'grave', 'breve', 'check', 'mathring', 'boxed', 'cancel', 'bcancel',
  'xcancel', 'underbrace', 'overbrace', 'mathop', 'mathbin', 'mathrel', 'mathord'
]);

const UMLAUTS = { a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü', e: 'ë', i: 'ï' };

const MATRIX_DELIMS = {
  pmatrix: ['(', ')'], bmatrix: ['[', ']'], Bmatrix: ['{', '}'], vmatrix: ['|', '|'],
  Vmatrix: ['||', '||'], cases: ['{', '']
};

/** Number of required arguments, so `x_\text{max}` takes `\text{max}` whole. */
function argCount(name) {
  if (name === 'frac' || name === 'dfrac' || name === 'tfrac' || name === 'cfrac') return 2;
  if (name === 'binom' || name === 'dbinom' || name === 'tbinom') return 2;
  if (name === 'textcolor' || name === 'overset' || name === 'underset' || name === 'stackrel') return 2;
  if (TEXT_STYLES[name] || ACCENTS.has(name) || name === 'sqrt' || name === 'operatorname') return 1;
  return 0;
}

const CONTROL = /\\([a-zA-Z]+\*?|[\s\S])/y;
const NUMBER = /\d+(?:(?:\{[.,]\}|[.,])\d+)*/y;
const LETTERS = /\p{L}+/uy;
const TEXT_RUN = /[^\\{}$]+/y;

/**
 * Parse LaTeX source into atoms { text, kind, script, bold, italics }.
 * kind: ord | op | bin | rel | open | close | punct | space | newline.
 */
function parseLatex(src, atoms, ctx) {
  let i = 0;

  const add = (text, kind = 'ord', italics = false) => {
    if (!text) return;
    atoms.push({ text, kind, script: ctx.script || null, bold: !!ctx.bold, italics: italics || !!ctx.italic });
  };
  const skipSpaces = () => { while (i < src.length && /\s/.test(src[i])) i++; };

  // One argument: {group}, a command with its own arguments, or one character.
  const readArg = () => {
    skipSpaces();
    if (i >= src.length) return '';
    if (src[i] === '{') {
      const start = ++i;
      let depth = 1;
      for (; i < src.length; i++) {
        if (src[i] === '\\') { i++; continue; }
        if (src[i] === '{') depth++;
        else if (src[i] === '}' && --depth === 0) return src.slice(start, i++);
      }
      return src.slice(start);
    }
    if (src[i] === '\\') {
      const start = i;
      CONTROL.lastIndex = i;
      const m = CONTROL.exec(src);
      i += m ? m[0].length : 1;
      if (m) {
        if (m[1] === 'sqrt') readOptional();
        for (let n = argCount(m[1].replace(/\*$/, '')); n > 0; n--) readArg();
      }
      return src.slice(start, i);
    }
    const ch = String.fromCodePoint(src.codePointAt(i));
    i += ch.length;
    return ch;
  };
  const readOptional = () => {
    skipSpaces();
    if (src[i] !== '[') return null;
    const end = src.indexOf(']', i);
    if (end === -1) return null;
    const inner = src.slice(i + 1, end);
    i = end + 1;
    return inner;
  };
  const nested = (tex, over = {}) => parseLatex(tex, atoms, { ...ctx, ...over });
  // A fraction part or root argument; wrapped in parentheses unless it is a
  // single item (scripts belong to their base and do not count).
  const grouped = (tex) => {
    const part = [];
    parseLatex(tex, part, ctx);
    const items = part.filter(a => !a.script && a.kind !== 'space');
    const wrap = items.length > 1;
    if (wrap) add('(', 'open');
    atoms.push(...part);
    if (wrap) add(')', 'close');
  };

  const command = (name) => {
    if (name in SPACES) return add(SPACES[name], 'space');
    if (IGNORED.has(name)) {
      if ((name === 'left' || name === 'right' || name === 'middle') && src[i] === '.') i++;
      return;
    }
    if (name === '\\') {
      readOptional();
      return ctx.script ? add(',', 'punct') : add('\n', 'newline');
    }
    if (name.length === 1 && !/[a-zA-Z]/.test(name)) {
      if (name === '"') {
        const base = readArg();
        return add(UMLAUTS[base] || base);
      }
      if (name === '|') return add('||');
      return add(name); // \% \& \$ \# \_ \{ \}
    }
    const star = name.endsWith('*');
    const base = star ? name.slice(0, -1) : name;
    skipSpaces(); // TeX drops spaces after a control word
    if (GREEK[base]) return add(GREEK[base]);
    if (SYMBOLS[base]) return add(SYMBOLS[base][0], SYMBOLS[base][1]);
    if (FUNCTIONS.has(base)) return add(base, 'op');
    if (TEXT_STYLES[base]) return nested(readArg(), TEXT_STYLES[base]);
    if (ACCENTS.has(base)) return nested(readArg());
    switch (base) {
      case 'frac': case 'dfrac': case 'tfrac': case 'cfrac': {
        const num = readArg();
        const den = readArg();
        grouped(num);
        add('/');
        return grouped(den);
      }
      case 'binom': case 'dbinom': case 'tbinom': {
        const n = readArg();
        const k = readArg();
        add('C');
        add('(', 'open');
        nested(n);
        add(',', 'punct');
        nested(k);
        return add(')', 'close');
      }
      case 'sqrt': {
        const degree = readOptional();
        if (degree) nested(degree, { script: 'sup' });
        add('√');
        return grouped(readArg());
      }
      case 'operatorname':
        return add(readArg().replace(/\\[,;: ]/g, ' ').replace(/[\\{}]/g, ''), 'op');
      case 'overset': case 'underset': case 'stackrel':
        readArg();
        return nested(readArg());
      case 'textcolor':
        readArg();
        return nested(readArg());
      case 'color': case 'label': case 'phantom': case 'hphantom': case 'vphantom':
        readArg();
        return;
      case 'hspace': case 'vspace':
        readArg();
        return add(' ', 'space');
      case 'pmod':
        add('(', 'open');
        add('mod', 'op');
        nested(readArg());
        return add(')', 'close');
      case 'tag':
        add(' ', 'space');
        return add(`(${readArg()})`);
      case 'not':
        if (src[i] === '=') { i++; return add('≠', 'rel'); }
        return add('not', 'op');
      case 'begin': {
        const env = readArg();
        if (env === 'array' || env === 'tabular' || env === 'alignat' || env === 'alignat*') readArg();
        if (MATRIX_DELIMS[env]) add(MATRIX_DELIMS[env][0], 'open');
        return;
      }
      case 'end': {
        const env = readArg();
        if (MATRIX_DELIMS[env]) add(MATRIX_DELIMS[env][1], 'close');
        return;
      }
      default:
        return add(base, 'op'); // unknown command: show its name as a word
    }
  };

  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      CONTROL.lastIndex = i;
      const m = CONTROL.exec(src);
      if (!m) { i++; continue; }
      i += m[0].length;
      command(m[1]);
      continue;
    }
    if (ch === '{') {
      const inner = readArg();
      if (inner === ',' || inner === '.') add(inner);
      else nested(inner);
      continue;
    }
    if (ch === '}' || ch === '$') { i++; continue; }
    if (ctx.text) {
      TEXT_RUN.lastIndex = i;
      const run = TEXT_RUN.exec(src)[0];
      i += run.length;
      add(run.replace(/\s+/g, ' ').replace(/~/g, ' '));
      continue;
    }
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '^' || ch === '_') {
      i++;
      const arg = readArg();
      // ^\circ is a degree sign and ^\prime a prime; both already sit high.
      if (ch === '^' && /^\s*\\circ\s*$/.test(arg)) { add('°'); continue; }
      if (ch === '^' && /^\s*(\\prime\s*)+$/.test(arg)) { add('′'.repeat(arg.split('\\prime').length - 1)); continue; }
      nested(arg, { script: ch === '^' ? 'sup' : 'sub' });
      continue;
    }
    NUMBER.lastIndex = i;
    const num = NUMBER.exec(src);
    if (num) {
      add(num[0].replace(/\{([.,])\}/g, '$1'));
      i += num[0].length;
      continue;
    }
    LETTERS.lastIndex = i;
    const word = LETTERS.exec(src);
    if (word) {
      add(word[0], 'ord', !ctx.upright);
      i += word[0].length;
      continue;
    }
    const c = String.fromCodePoint(src.codePointAt(i));
    i += c.length;
    if (c === '-' || c === '−') add('−', 'bin');
    else if ('+×·±÷*'.includes(c)) add(c, 'bin');
    else if ('=<>≈≠≤≥:'.includes(c)) add(c, 'rel');
    else if (c === ',' || c === ';') add(c, 'punct');
    else if (c === '(' || c === '[') add(c, 'open');
    else if (c === ')' || c === ']') add(c, 'close');
    else if (c === '&' || c === '~') add(' ', 'space');
    else if (c === "'") add('′');
    else add(c);
  }
}

/** Whether TeX would put space between two adjacent base-level atoms. */
function needsSpace(prev, cur) {
  if (cur === 'rel') return prev !== 'open';
  if (prev === 'rel') return cur !== 'close' && cur !== 'punct';
  if (prev === 'bin' || cur === 'bin') return true;
  if (prev === 'punct') return cur !== 'close';
  if (prev === 'op') return cur === 'ord' || cur === 'op';
  if (cur === 'op') return prev === 'ord' || prev === 'close' || prev === 'op';
  return false;
}

/** Turn atoms into merged pdfmake text pieces with TeX-like spacing. */
function layoutAtoms(atoms) {
  const pieces = [];
  const lastChar = () => {
    const last = pieces[pieces.length - 1];
    return last ? last.text.slice(-1) : '';
  };
  const emit = (text, atom) => {
    const style = { italics: !!atom?.italics, bold: !!atom?.bold, script: atom?.script || null };
    const last = pieces[pieces.length - 1];
    if (last && last.italics === style.italics && last.bold === style.bold && last.script === style.script) {
      last.text += text;
    } else {
      pieces.push({ text, ...style });
    }
  };
  const space = (text) => {
    const prev = lastChar();
    if (prev && !/\s/.test(prev)) emit(text, null);
  };
  const trimEnd = () => {
    while (pieces.length) {
      const last = pieces[pieces.length - 1];
      last.text = last.text.replace(/[^\S\n]+$/, '');
      if (last.text) break;
      pieces.pop();
    }
  };
  const nextBase = (k) => {
    for (let n = k + 1; n < atoms.length; n++) {
      if (!atoms[n].script && atoms[n].kind !== 'space') return atoms[n];
    }
    return null;
  };

  let prevKind = null; // kind of the last base-level atom on this line
  atoms.forEach((atom, k) => {
    if (atom.kind === 'newline') {
      trimEnd();
      if (pieces.length) emit('\n', null);
      prevKind = null;
      return;
    }
    if (atom.kind === 'space') {
      if (atom.script) emit(atom.text, atom);
      else space(atom.text);
      return;
    }
    if (atom.script) { // no automatic spacing inside scripts
      emit(atom.text, atom);
      return;
    }
    let kind = atom.kind;
    if (kind === 'bin') {
      const next = nextBase(k);
      const unary = !prevKind || ['bin', 'rel', 'open', 'punct', 'op'].includes(prevKind);
      if (unary || !next || ['rel', 'close', 'punct'].includes(next.kind)) kind = 'ord';
    }
    if (prevKind && needsSpace(prevKind, kind)) space(' ');
    emit(atom.text, atom);
    prevKind = kind;
  });
  trimEnd();

  return pieces.map(p => {
    const out = { text: p.text };
    if (p.italics) out.italics = true;
    if (p.bold) out.bold = true;
    if (p.script) out[p.script] = true;
    return out;
  });
}

/**
 * Convert LaTeX math (without $ delimiters) into an array of pdfmake inline
 * text objects, e.g. "m^{-2}" → [{ text: 'm', italics: true }, { text: '−2', sup: true }].
 */
export function latexToPdfText(tex) {
  const atoms = [];
  parseLatex(String(tex || ''), atoms, {});
  return layoutAtoms(atoms);
}

/** Plain-text rendering (scripts written as ^x / _x), mainly for tests. */
export function latexToPlainText(tex) {
  let out = '';
  let script = null;
  for (const p of latexToPdfText(tex)) {
    const s = p.sup ? '^' : p.sub ? '_' : null;
    if (s && s !== script) out += s;
    out += p.text;
    script = s;
  }
  return out;
}
