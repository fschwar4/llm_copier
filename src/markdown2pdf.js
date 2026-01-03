import './lib/pdfmake.min.js';
import './lib/vfs_fonts.js';
import './lib/highlight.min.js';

// Debug: Check if hljs loaded
console.log('[PDF Generator] highlight.js loaded:', typeof hljs !== 'undefined');
if (typeof hljs !== 'undefined') {
  console.log('[PDF Generator] hljs version:', hljs.versionString || 'unknown');
  console.log('[PDF Generator] Available languages:', hljs.listLanguages ? hljs.listLanguages().length : 'listLanguages not available');
}

/**
 * Default PDF settings - must match settings.js
 */
const DEFAULT_SETTINGS = {
  // Page layout
  pageSize: 'A4',
  pageMargins: 40,
  
  // Font sizes
  fontTitle: 26,
  fontH1: 22,
  fontH2: 18,
  fontH3: 15,
  fontBody: 11,
  fontCode: 10,
  
  // Colors
  colorTitle: '#2c3e50',
  colorH1: '#2c3e50',
  colorH2: '#34495e',
  colorBody: '#212121',
  colorLink: '#1a0dab',
  
  // Code blocks
  codeBg: '#f8f8f8',
  syntaxHighlight: true,
  
  // Table of contents
  tocEnabled: true,

  // Table styling
  tableLineWidth: 0.5,
  tableHeaderLineColor: '#000000',
  tableLineColor: '#cccccc'
  ,
  /**
   * Background fill color for the table header row. This allows customizing the
   * subtle shading applied to the first row of each table.
   */
  tableHeaderFillColor: '#f5f5f5'
};

/**
 * Load PDF settings from browser storage
 */
async function getSettings() {
  try {
    const result = await browser.storage.local.get('pdfSettings');
    const settings = { ...DEFAULT_SETTINGS, ...result.pdfSettings };
    console.log('[PDF Generator] Loaded settings:', settings);
    return settings;
  } catch (e) {
    console.warn('[PDF Generator] Failed to load settings, using defaults:', e);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Syntax highlighting color scheme (based on popular IDE themes)
 */
const SYNTAX_COLORS = {
  // Keywords and control flow
  keyword: '#0033B3',      // blue - if, for, function, return, etc.
  built_in: '#7A3E9D',     // purple - console, window, document
  literal: '#0033B3',      // blue - true, false, null
  
  // Strings and values
  string: '#067D17',       // green - "text", 'text'
  number: '#1750EB',       // blue - 42, 3.14
  regexp: '#264EFF',       // blue - regular expressions
  
  // Comments and docs
  comment: '#8C8C8C',      // gray - // comment
  doctag: '#8C8C8C',       // gray - @param, @return
  
  // Functions and classes
  function: '#00627A',     // teal - function calls
  title: '#00627A',        // teal - class/function definitions  
  'title.function': '#00627A',
  'title.class': '#7A3E9D',
  class: '#7A3E9D',        // purple - class names
  
  // Variables and properties
  variable: '#871094',     // magenta - variables
  property: '#871094',     // magenta - object properties
  attr: '#174AD4',         // blue - HTML/XML attributes
  params: '#000000',       // black - function parameters
  
  // HTML/XML specific
  tag: '#0033B3',          // blue - HTML tags
  name: '#0033B3',         // blue - tag names
  attribute: '#174AD4',    // blue - attributes
  
  // Operators and punctuation
  operator: '#000000',     // black - +, -, =
  punctuation: '#000000',  // black - (), {}, []
  
  // Special
  meta: '#9E880D',         // yellow/brown - meta info, decorators
  symbol: '#067D17',       // green - symbols
  selector: '#0033B3',     // blue - CSS selectors
  'selector-tag': '#0033B3',
  'selector-class': '#7A3E9D',
  'selector-id': '#174AD4',
  
  // Template strings
  subst: '#000000',        // black - template substitutions
  'template-variable': '#871094',
  
  // Types
  type: '#7A3E9D',         // purple - type annotations
  
  // Default
  default: '#333333'       // default text color
};

/**
 * Converts highlight.js HTML output to pdfmake styled text array
 * Handles nested spans by using a DOM parser approach
 */
function hljsToPdfmake(highlightedHtml) {
  const result = [];
  
  // Use DOMParser instead of innerHTML for security (avoids Firefox addon warning)
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${highlightedHtml}</div>`, 'text/html');
  const temp = doc.body.firstChild;
  
  console.log('[PDF Generator] hljsToPdfmake parsing HTML, childNodes:', temp.childNodes.length);
  
  function getColorForClasses(classList) {
    if (!classList) return null;
    
    for (const cls of classList) {
      if (cls.startsWith('hljs-')) {
        const tokenType = cls.replace('hljs-', '');
        
        // Try exact match first
        if (SYNTAX_COLORS[tokenType]) {
          return SYNTAX_COLORS[tokenType];
        }
        
        // Try with dots replaced (e.g., title.function -> title)
        const basePart = tokenType.split('.')[0];
        if (SYNTAX_COLORS[basePart]) {
          return SYNTAX_COLORS[basePart];
        }
        
        console.log('[PDF Generator] Unknown token type:', tokenType);
      }
    }
    return null;
  }
  
  function processNode(node, inheritedColor) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text) {
        result.push({
          text: text,
          color: inheritedColor || SYNTAX_COLORS.default
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Determine color from class, or inherit from parent
      const color = getColorForClasses(node.classList) || inheritedColor;
      
      // Process children
      for (const child of node.childNodes) {
        processNode(child, color);
      }
    }
  }
  
  // Process all child nodes
  for (const child of temp.childNodes) {
    processNode(child, SYNTAX_COLORS.default);
  }
  
  // Debug: show some colored items
  const coloredItems = result.filter(item => item.color !== SYNTAX_COLORS.default);
  console.log('[PDF Generator] Total items:', result.length, 'Colored items:', coloredItems.length);
  if (coloredItems.length > 0) {
    console.log('[PDF Generator] Sample colored item:', coloredItems[0]);
  }
  
  return result;
}

/**
 * Applies syntax highlighting to code and returns pdfmake content
 */
function highlightCode(code, language) {
  console.log('[PDF Generator] highlightCode called with language:', language || '(auto-detect)');
  console.log('[PDF Generator] Code length:', code.length, 'chars');
  console.log('[PDF Generator] hljs available:', typeof hljs !== 'undefined');
  
  try {
    // Check if hljs is available
    if (typeof hljs === 'undefined') {
      console.warn('[PDF Generator] hljs is undefined - highlight.js not loaded properly');
      return [{ text: code, color: SYNTAX_COLORS.default }];
    }
    
    let highlighted;
    
    if (language && hljs.getLanguage(language)) {
      console.log('[PDF Generator] Using specified language:', language);
      highlighted = hljs.highlight(code, { language: language });
    } else {
      if (language) {
        console.log('[PDF Generator] Language not recognized:', language, '- using auto-detect');
      }
      // Auto-detect language
      highlighted = hljs.highlightAuto(code);
      console.log('[PDF Generator] Auto-detected language:', highlighted.language || 'none');
      console.log('[PDF Generator] Detection relevance:', highlighted.relevance);
    }
    
    console.log('[PDF Generator] Highlighted HTML length:', highlighted.value.length);
    console.log('[PDF Generator] Highlighted HTML sample:', highlighted.value.substring(0, 200));
    
    const pdfContent = hljsToPdfmake(highlighted.value);
    console.log('[PDF Generator] PDF content items:', pdfContent.length);
    
    return pdfContent;
  } catch (e) {
    console.error('[PDF Generator] Syntax highlighting failed:', e);
    return [{ text: code, color: SYNTAX_COLORS.default }];
  }
}

/**
 * Helper: Sanitizes text for PDFMake.
 * Ensures undefined/null becomes empty string.
 * Currently preserves Unicode (Emojis, etc) but standardizes some arrows for safety.
 */
function cleanText(text) {
  if (!text) return "";
  // Ensure the input is a string to prevent errors
  return String(text);
}

/**
 * Helper: Parses a single text string into an array of pdfmake objects 
 * to handle **Bold**, `Inline Code`, and [Links](url).
 */
function parseInline(text) {
  if (!text) return [];
  const regex = /(\*\*.*?\*\*)|(`.*?`)|(\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);
  const inlineContent = [];
  parts.forEach(part => {
    if (!part) return;
    // 1. Handle Bold
    if (part.startsWith('**') && part.endsWith('**')) {
      inlineContent.push({ text: cleanText(part.slice(2, -2)), bold: true });
    }
    // 2. Handle Inline Code
    else if (part.startsWith('`') && part.endsWith('`')) {
      inlineContent.push({
        text: cleanText(part.slice(1, -1)),
        style: 'inline_code'
      });
    }
    // 3. Handle Links
    else if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        inlineContent.push({
          text: cleanText(linkMatch[1]),
          link: linkMatch[2],
          style: 'link'
        });
      } else {
        inlineContent.push(cleanText(part));
      }
    }
    // 4. Regular Text
    else {
      inlineContent.push(cleanText(part));
    }
  });
  return inlineContent;
}

/**
 * Helper: Extracts Title, Author, and Date from YAML header
 * and returns the cleaned Markdown content.
 */
function extractMetadata(md) {
  const yamlRegex = /^---([\s\S]*?)---/;
  const match = md.match(yamlRegex);
  const metadata = {
    title: 'Chat Export',
    author: 'LLM Copier',
    date: new Date().toISOString().split('T')[0],
    cleanMd: md
  };
  if (match) {
    const yamlContent = match[1];
    const titleMatch = yamlContent.match(/title:\s*"([^"]*)"/);
    const authorMatch = yamlContent.match(/author:\s*"([^"]*)"/);
    const dateMatch = yamlContent.match(/date:\s*"([^"]*)"/);
    if (titleMatch) metadata.title = titleMatch[1];
    if (authorMatch) metadata.author = authorMatch[1];
    if (dateMatch) metadata.date = dateMatch[1];
    metadata.cleanMd = md.replace(yamlRegex, '').replace(/\newpage/g, '').trim();
  }
  return metadata;
}

/**
 * Parses Markdown text into pdfmake content objects.
 * @param {string} md - Markdown content
 * @param {object} settings - PDF settings from storage
 */
function parseMarkdownToPdfContent(md, settings = DEFAULT_SETTINGS) {
  const content = [];
  const lines = md.split('\n');
  // State variables for code blocks
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockMargin = 0;
  let codeBlockLanguage = '';
  // State variables for lists
  let inList = false;
  let listType = null;
  let currentList = [];
  // State variables for tables
  let collectingTable = false;
  let tableRows = [];
  // Regex helpers (allow leading whitespace)
  const headerRegex = /^\s*(#{1,7})\s+(.*)/;
  const ulRegex = /^\s*[-*]\s+(.*)/;
  const olRegex = /^\s*\d+\.\s+(.*)/;
  const quoteRegex = /^\s*>\s+(.*)/;

  /**
   * Helper to detect if a given line is a Markdown table delimiter.
   * A delimiter line separates the header row from table body rows and typically
   * looks like "|---|---|---|" or variants with optional leading/trailing pipes,
   * spaces and alignment colons (e.g. "| :--- | ---: | :-: |").
   *
   * @param {string} line - The raw line (not trimmed)
   * @returns {boolean} True if the line is a table delimiter
   */
  function isTableDelimiter(line) {
    if (!line || !line.includes('|')) return false;
    let delim = line.trim();
    // Normalize by ensuring leading and trailing pipes exist so that split
    // produces only cell delimiter segments. This allows detection for
    // delimiters with or without starting/ending '|'.
    if (!delim.startsWith('|')) delim = '|' + delim;
    if (!delim.endsWith('|')) delim = delim + '|';
    // Remove the first and last pipe and split into individual cell markers
    const cells = delim.slice(1, -1).split('|');
    // Each cell marker must consist of optional colon(s), at least three hyphens,
    // and optional colon(s). Allow whitespace around the markers.
    return cells.every(cell => {
      const c = cell.trim();
      return /^:?-{3,}:?$/.test(c);
    });
  }
  const flushList = () => {
    if (inList && currentList.length > 0) {
      if (listType === 'ul') {
        content.push({ ul: currentList, margin: [0, 5, 0, 10] });
      } else {
        content.push({ ol: currentList, margin: [0, 5, 0, 10] });
      }
      currentList = [];
      inList = false;
      listType = null;
    }
  };
  const flushTable = () => {
    if (collectingTable && tableRows.length > 0) {
      // Build a custom table layout based on the current settings. This layout
      // defines line widths and colors for horizontal and vertical lines and
      // applies a light background color to the header row. The horizontal
      // dividing line between the header and body (i === 1) uses a distinct
      // color specified in settings.tableHeaderLineColor. All other lines use
      // settings.tableLineColor. Line width defaults to settings.tableLineWidth.
      const tableLayout = {
        hLineWidth: (i, node) => {
          // Use the configured line width for all horizontal lines
          return settings.tableLineWidth ?? 0.5;
        },
        vLineWidth: (i, node) => {
          // Use the configured line width for all vertical lines
          return settings.tableLineWidth ?? 0.5;
        },
        hLineColor: (i, node) => {
          // If this is the horizontal line below the header (index 1), use the
          // header divider color; otherwise use the general table line color
          return (i === 1 ? (settings.tableHeaderLineColor || '#000000') : (settings.tableLineColor || '#cccccc'));
        },
        vLineColor: (i, node) => {
          return settings.tableLineColor || '#cccccc';
        },
        fillColor: (rowIndex, node, colIndex) => {
          // Apply a fill color to the header row using the configured color. If not set,
          // fall back to a default light grey.
          if (rowIndex === 0) {
            return settings.tableHeaderFillColor || '#f5f5f5';
          }
          return null;
        }
      };
      content.push({
        table: { body: tableRows },
        layout: tableLayout,
        margin: [0, 5, 0, 10]
      });
      tableRows = [];
      collectingTable = false;
    }
  };
  // Iterate over lines with index to allow lookahead for tables
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    // Handle fenced code blocks first
    if (trimmed.startsWith('```')) {
      flushTable();
      flushList();
      if (inCodeBlock) {
        // End of code block
        const expandedCode = codeBlockContent.replace(/\n$/, '').split('\n').map((cLine) => {
          const match = cLine.match(/^(\s*)(.*)/);
          const leadingSpaces = match[1];
          const rest = match[2];
          return leadingSpaces.replace(/ /g, '  ') + rest;
        }).join('\n');
        let codeContent;
        if (settings.syntaxHighlight) {
          codeContent = highlightCode(expandedCode, codeBlockLanguage);
        } else {
          codeContent = [{ text: expandedCode, color: '#333333' }];
        }
        content.push({
          table: {
            widths: ['100%'],
            body: [[{
              text: codeContent,
              style: 'code_block',
              border: [false, false, false, false],
              fillColor: settings.codeBg || '#f8f8f8',
              preserveLeadingSpaces: true
            }]]
          },
          layout: 'noBorders',
          margin: [codeBlockMargin, 5, 0, 10]
        });
        codeBlockContent = '';
        inCodeBlock = false;
        codeBlockMargin = 0;
        codeBlockLanguage = '';
      } else {
        // Start of code block
        inCodeBlock = true;
        const langMatch = trimmed.match(/^```\{?(\w+)\}?/);
        codeBlockLanguage = langMatch ? langMatch[1].toLowerCase() : '';
        const indentMatch = line.match(/^\s*/);
        const indentSize = indentMatch ? indentMatch[0].length : 0;
        codeBlockMargin = indentSize * 4;
      }
      continue;
    }
    // If inside code block, accumulate code and continue
    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      continue;
    }
    // Table detection logic
    // If we're not currently collecting a table, check if the current line is a header row
    // and the next line is a delimiter line. A valid header row must contain at least
    // one pipe character to separate columns. The delimiter line is detected via
    // the isTableDelimiter helper defined above.
    if (!collectingTable) {
      const nextRaw = lines[i + 1] || null;
      if (trimmed.includes('|') && nextRaw && isTableDelimiter(nextRaw)) {
        // Begin collecting table rows
        flushList();
        collectingTable = true;
        // Normalize header row by removing leading/trailing pipes, then split on pipes
        let header = trimmed;
        if (header.startsWith('|')) header = header.slice(1);
        if (header.endsWith('|')) header = header.slice(0, -1);
        const headerCells = header.split('|').map(cell => cell.trim());
        tableRows.push(headerCells.map(cell => ({ text: cleanText(cell), bold: true })));
        // Skip the delimiter line by incrementing i
        i++;
        continue;
      }
    }
    // If currently collecting a table, process each subsequent row until a non-table line
    if (collectingTable) {
      // A valid table row must contain at least one pipe character
      if (trimmed.includes('|')) {
        // Normalize row by removing optional leading/trailing pipes then split on pipes
        let rowLine = trimmed;
        if (rowLine.startsWith('|')) rowLine = rowLine.slice(1);
        if (rowLine.endsWith('|')) rowLine = rowLine.slice(0, -1);
        const cells = rowLine.split('|').map(cell => ({ text: cleanText(cell.trim()) }));
        tableRows.push(cells);
        continue;
      } else {
        // End of table: flush accumulated table rows and continue normal processing
        flushTable();
        // fall through to handle the current line normally
      }
    }
    // Lists
    const ulMatch = line.match(ulRegex);
    const olMatch = line.match(olRegex);
    if (ulMatch || olMatch) {
      flushTable();
      const type = ulMatch ? 'ul' : 'ol';
      const text = ulMatch ? ulMatch[1] : olMatch[1];
      const indentMatch = line.match(/^\s*/);
      const indentSize = indentMatch ? indentMatch[0].length : 0;
      const leftMargin = Math.max(0, indentSize * 4);
      if (inList && listType !== type) {
        flushList();
      }
      inList = true;
      listType = type;
      currentList.push({
        text: parseInline(text),
        margin: [leftMargin, 2, 0, 2]
      });
      continue;
    }
    // Blank line inside list
    if (trimmed === '') {
      continue;
    }
    // Flush list before other content
    flushList();
    // Headers
    const headerMatch = line.match(headerRegex);
    if (headerMatch) {
      flushTable();
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      let styleName = 'body';
      if (level === 1) styleName = 'header';
      else if (level === 2) styleName = 'subheader';
      else styleName = `h${level}`;
      const headerObj = {
        text: cleanText(text),
        style: styleName,
        tocItem: level === 1
      };
      if (level === 1) {
        headerObj.tocStyle = 'toc_header';
      }
      content.push(headerObj);
      continue;
    }
    // Blockquotes
    const quoteMatch = line.match(quoteRegex);
    if (quoteMatch) {
      flushTable();
      content.push({
        text: parseInline(quoteMatch[1]),
        style: 'quote'
      });
      continue;
    }
    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      flushTable();
      content.push({
        canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#cccccc' }],
        margin: [0, 10, 0, 10]
      });
      continue;
    }
    // Standard paragraph
    if (trimmed !== '') {
      flushTable();
      content.push({
        text: parseInline(trimmed),
        style: 'body'
      });
    }
  }
  // Flush any remaining structures
  flushList();
  flushTable();
  return content;
}

/**
 * Generates and downloads a PDF with customizable settings.
 */
export async function markdownToPdf(markdown, filename = 'chat-export.pdf') {
  console.log('[PDF Generator] Starting conversion...');
  // Load settings from storage
  const settings = await getSettings();
  console.log('[PDF Generator] Using settings:', settings);
  const { title, author, date, cleanMd } = extractMetadata(markdown);
  pdfMake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    },
    Courier: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  };
  // Build content array based on TOC setting
  const contentArray = [
    { text: cleanText(title), style: 'reportTitle', margin: [0, 60, 0, 10], alignment: 'center' },
    { text: cleanText(author), style: 'reportAuthor', alignment: 'center', margin: [0, 0, 0, 5] },
    { text: cleanText(date), style: 'reportDate', alignment: 'center', margin: [0, 0, 0, 40] }
  ];
  if (settings.tocEnabled) {
    contentArray.push(
      { text: 'Table of Contents', style: 'h3', margin: [0, 20, 0, 10] },
      {
        toc: {
          title: { text: '' },
          numberStyle: { bold: true }
        }
      }
    );
  }
  contentArray.push({ text: '', pageBreak: 'after' });
  contentArray.push(...parseMarkdownToPdfContent(cleanMd, settings));
  const docDefinition = {
    pageSize: settings.pageSize || 'A4',
    pageMargins: [settings.pageMargins, settings.pageMargins, settings.pageMargins, settings.pageMargins],
    content: contentArray,
    styles: {
      reportTitle: { fontSize: settings.fontTitle, bold: true, color: settings.colorTitle },
      reportAuthor: { fontSize: 14, color: '#555555' },
      reportDate: { fontSize: 12, italics: true, color: '#7f8c8d' },
      toc_header: { fontSize: 12, bold: false, margin: [0, 5, 0, 0] },
      header: { fontSize: settings.fontH1, bold: true, color: settings.colorH1, margin: [0, 15, 0, 10] },
      subheader: { fontSize: settings.fontH2, bold: true, color: settings.colorH2, margin: [0, 12, 0, 8] },
      h3: { fontSize: settings.fontH3, bold: true, color: settings.colorH1, margin: [0, 10, 0, 5] },
      h4: { fontSize: 13, bold: true, color: '#444444', margin: [0, 8, 0, 5] },
      h5: { fontSize: 12, bold: true, italics: true, color: '#555555', margin: [0, 5, 0, 5] },
      h6: { fontSize: 11, bold: true, color: '#7f8c8d', margin: [0, 5, 0, 5] },
      h7: { fontSize: 10, bold: true, italics: true, color: '#95a5a6', margin: [0, 5, 0, 5] },
      body: { fontSize: settings.fontBody, color: settings.colorBody, margin: [0, 0, 0, 6], lineHeight: 1.4 },
      code_block: { font: 'Courier', fontSize: settings.fontCode, color: '#333333', margin: [5, 5, 5, 5] },
      inline_code: { font: 'Courier', fontSize: settings.fontCode, color: '#d63384', background: '#f8f9fa' },
      quote: { fontSize: settings.fontBody, italics: true, color: '#555555', margin: [20, 5, 0, 10], background: '#fafafa' },
      link: { color: settings.colorLink, decoration: 'underline' }
    },
    defaultStyle: {
      font: 'Roboto'
    },
    info: {
      title: cleanText(title),
      author: cleanText(author)
    }
  };
  try {
    pdfMake.createPdf(docDefinition).download(filename);
    console.log('[PDF Generator] Download started.');
  } catch (e) {
    console.error('[PDF Generator] Error creating PDF:', e);
  }
  // Ensure the async function has a closing brace. Without this, the file would
  // fail to parse due to an unbalanced bracket. The try/catch block above
  // handles errors during PDF creation, and this brace closes the
  // markdownToPdf function definition.
}