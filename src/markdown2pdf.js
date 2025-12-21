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
  tocEnabled: true
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
  
  // Create a temporary element to parse the HTML
  const temp = document.createElement('div');
  temp.innerHTML = highlightedHtml;
  
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
    
    const titleMatch = yamlContent.match(/title:\s*"(.*?)"/);
    const authorMatch = yamlContent.match(/author:\s*"(.*?)"/);
    const dateMatch = yamlContent.match(/date:\s*"(.*?)"/);

    if (titleMatch) metadata.title = titleMatch[1];
    if (authorMatch) metadata.author = authorMatch[1];
    if (dateMatch) metadata.date = dateMatch[1];

    metadata.cleanMd = md.replace(yamlRegex, '').replace(/\\newpage/g, '').trim();
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
  
  // State variables
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockMargin = 0; // Stores indentation for the current block
  let codeBlockLanguage = ''; // Language for syntax highlighting
  
  let inList = false;
  let listType = null; // 'ul' or 'ol'
  let currentList = [];

  // Regex Helpers - Updated to allow leading whitespace for indentation
  const headerRegex = /^\s*(#{1,7})\s+(.*)/;
  const ulRegex = /^\s*[-*]\s+(.*)/;
  const olRegex = /^\s*\d+\.\s+(.*)/;
  const quoteRegex = /^\s*>\s+(.*)/;

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

  lines.forEach((line) => {
    const trimmed = line.trim();

    // --- 1. CODE BLOCKS ---
    if (trimmed.startsWith('```')) {
      flushList(); 
      if (inCodeBlock) {
        // END OF CODE BLOCK
        // Expand 2-space indentation to 4-space for better readability
        const expandedCode = codeBlockContent
          .replace(/\n$/, '')
          .split('\n')
          .map(line => {
            const match = line.match(/^(\s*)(.*)/);
            const leadingSpaces = match[1];
            const rest = match[2];
            // Double each leading space (2-space -> 4-space indentation)
            return leadingSpaces.replace(/ /g, '  ') + rest;
          })
          .join('\n');
        
        // Apply syntax highlighting if enabled in settings
        let codeContent;
        if (settings.syntaxHighlight) {
          codeContent = highlightCode(expandedCode, codeBlockLanguage);
        } else {
          // Plain text without highlighting
          codeContent = [{ text: expandedCode, color: '#333333' }];
        }
        
        content.push({
          table: {
            widths: ['100%'],
            body: [[{ 
              // Use highlighted text array or plain text
              text: codeContent, 
              style: 'code_block',
              border: [false, false, false, false], 
              fillColor: settings.codeBg || '#f8f8f8',
              preserveLeadingSpaces: true
            }]]
          },
          layout: 'noBorders',
          // Apply the captured margin to the entire block
          margin: [codeBlockMargin, 5, 0, 10]
        });
        codeBlockContent = '';
        inCodeBlock = false;
        codeBlockMargin = 0;
        codeBlockLanguage = '';
      } else {
        // START OF CODE BLOCK
        inCodeBlock = true;
        
        // Extract language from the code fence (e.g., ```javascript or ```{python})
        const langMatch = trimmed.match(/^```\{?(\w+)\}?/);
        codeBlockLanguage = langMatch ? langMatch[1].toLowerCase() : '';
        
        console.log('[PDF Generator] Code block started, raw fence:', trimmed);
        console.log('[PDF Generator] Extracted language:', codeBlockLanguage || '(none)');
        
        // Capture indentation of the opening fence to align strictly with lists
        const indentMatch = line.match(/^\s*/);
        const indentSize = indentMatch ? indentMatch[0].length : 0;
        // 4 units per space aligns with list indentation logic
        codeBlockMargin = indentSize * 4; 
      }
      return;
    }
    
    if (inCodeBlock) {
      // Preserve line as-is for code content (strict indentation)
      codeBlockContent += line + '\n';
      return;
    }

    // --- 2. LISTS ---
    // Match against the raw line to detect patterns even if indented
    const ulMatch = line.match(ulRegex);
    const olMatch = line.match(olRegex);

    if (ulMatch || olMatch) {
      const type = ulMatch ? 'ul' : 'ol';
      const text = ulMatch ? ulMatch[1] : olMatch[1];
      
      // Calculate indentation level
      // Using 4 spaces per level as requested
      const indentMatch = line.match(/^\s*/);
      const indentSize = indentMatch ? indentMatch[0].length : 0;
      
      // Increased multiplier to 4 for more distinct visual whitespace in PDF
      // 4 spaces * 4 = 16 units of margin per level
      const leftMargin = Math.max(0, indentSize * 4);

      if (inList && listType !== type) {
        flushList();
      }

      inList = true;
      listType = type;
      
      currentList.push({ 
        text: parseInline(text), 
        // Apply strict visual indentation
        margin: [leftMargin, 2, 0, 2] 
      });
      return;
    }

    if (trimmed === '') {
      if (!inList) return; 
      return;
    }
    
    flushList();

    // --- 3. HEADERS (H1 - H7) ---
    const headerMatch = line.match(headerRegex);
    if (headerMatch) {
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
      return;
    }

    // --- 4. BLOCKQUOTES ---
    const quoteMatch = line.match(quoteRegex);
    if (quoteMatch) {
      content.push({
        text: parseInline(quoteMatch[1]),
        style: 'quote'
      });
      return;
    }

    // --- 5. HORIZONTAL RULE ---
    if (trimmed === '---' || trimmed === '***') {
      content.push({ 
        canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#cccccc' }], 
        margin: [0, 10, 0, 10] 
      });
      return;
    }

    // --- 6. STANDARD PARAGRAPH ---
    if (trimmed !== '') {
      content.push({
        text: parseInline(line.trim()), // Trim paragraph text
        style: 'body'
      });
    }
  });

  flushList();
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
    // --- TITLE PAGE ---
    { text: cleanText(title), style: 'reportTitle', margin: [0, 60, 0, 10], alignment: 'center' },
    { text: cleanText(author), style: 'reportAuthor', alignment: 'center', margin: [0, 0, 0, 5] },
    { text: cleanText(date), style: 'reportDate', alignment: 'center', margin: [0, 0, 0, 40] }
  ];

  // Add TOC if enabled
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

  // Page break before main content
  contentArray.push({ text: '', pageBreak: 'after' });

  // Add main content
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
      author: cleanText(author),
    }
  };

  try {
    pdfMake.createPdf(docDefinition).download(filename);
    console.log('[PDF Generator] Download started.');
  } catch (e) {
    console.error('[PDF Generator] Error creating PDF:', e);
  }
}