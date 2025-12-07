import './pdfmake.min.js';
import './vfs_fonts.js';

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
 */
function parseMarkdownToPdfContent(md) {
  const content = [];
  const lines = md.split('\n');
  
  // State variables
  let inCodeBlock = false;
  let codeBlockContent = '';
  
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
        content.push({
          table: {
            widths: ['100%'],
            body: [[{ 
              // Preserve exact content in code blocks
              text: codeBlockContent.replace(/\n$/, ''), 
              style: 'code_block',
              border: [false, false, false, false], 
              fillColor: '#f4f4f4' 
            }]]
          },
          layout: 'noBorders',
          margin: [0, 5, 0, 10]
        });
        codeBlockContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
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
 * Generates and downloads a PDF.
 */
export function markdownToPdf(markdown, filename = 'chat-export.pdf') {
  console.log('[PDF Generator] Starting conversion...');

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

  const docDefinition = {
    content: [
      // --- TITLE PAGE ---
      { text: cleanText(title), style: 'reportTitle', margin: [0, 60, 0, 10], alignment: 'center' },
      { text: cleanText(author), style: 'reportAuthor', alignment: 'center', margin: [0, 0, 0, 5] },
      { text: cleanText(date), style: 'reportDate', alignment: 'center', margin: [0, 0, 0, 40] },
      
      // --- TABLE OF CONTENTS ---
      { text: 'Table of Contents', style: 'h3', margin: [0, 20, 0, 10] },
      { 
        toc: {
          title: { text: '' },
          numberStyle: { bold: true } 
        } 
      },
      
      { text: '', pageBreak: 'after' },

      // --- MAIN CONTENT ---
      ...parseMarkdownToPdfContent(cleanMd)
    ],

    styles: {
      reportTitle: { fontSize: 26, bold: true, color: '#2c3e50' },
      reportAuthor: { fontSize: 14, color: '#555555' },
      reportDate: { fontSize: 12, italics: true, color: '#7f8c8d' },
      toc_header: { fontSize: 12, bold: false, margin: [0, 5, 0, 0] },
      header: { fontSize: 22, bold: true, color: '#2c3e50', margin: [0, 15, 0, 10] },
      subheader: { fontSize: 18, bold: true, color: '#34495e', margin: [0, 12, 0, 8] },
      h3: { fontSize: 15, bold: true, color: '#2c3e50', margin: [0, 10, 0, 5] },
      h4: { fontSize: 13, bold: true, color: '#444444', margin: [0, 8, 0, 5] },
      h5: { fontSize: 12, bold: true, italics: true, color: '#555555', margin: [0, 5, 0, 5] },
      h6: { fontSize: 11, bold: true, color: '#7f8c8d', margin: [0, 5, 0, 5] },
      h7: { fontSize: 10, bold: true, italics: true, color: '#95a5a6', margin: [0, 5, 0, 5] },
      body: { fontSize: 11, color: '#212121', margin: [0, 0, 0, 6], lineHeight: 1.4 },
      code_block: { font: 'Courier', fontSize: 10, color: '#333333', margin: [5, 5, 5, 5] },
      inline_code: { font: 'Courier', fontSize: 10, color: '#d63384', background: '#f8f9fa' },
      quote: { fontSize: 11, italics: true, color: '#555555', margin: [20, 5, 0, 10], background: '#fafafa' },
      link: { color: '#1a0dab', decoration: 'underline' }
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