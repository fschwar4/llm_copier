// --- HELPER FOR USER NAME EXTRACTIONS ---

/**
 * Extract user name from ChatGPT HTML content
 * @param {Element|Document|string} input - DOM element or HTML string
 * @returns {string} User name or "User" if not found
 */
export function getUserNameChatGPT(input) {
  try {
    let content;
    if (input instanceof Element || input instanceof Document) {
      content = input.outerHTML || input.documentElement?.outerHTML;
    } else {
      content = input;
    }
    
    if (input instanceof Element || input instanceof Document) {
      const userMenu = input.querySelector('[data-testid="user-menu-button"]');
      if (userMenu?.textContent?.trim()) {
        return userMenu.textContent.trim();
      }
      const profileDiv = input.querySelector('div[class^="user-name"]');
      if (profileDiv?.textContent?.trim()) {
        return profileDiv.textContent.trim();
      }
    } else {
      const userMenuMatch = content.match(/data-testid="user-menu-button"[^>]*>([^<]+)</);
      if (userMenuMatch?.[1]?.trim()) {
        return userMenuMatch[1].trim();
      }
      const profileDivMatch = content.match(/<div[^>]*class="[^"]*user-name[^"]*"[^>]*>([^<]+)</i);
      if (profileDivMatch?.[1]?.trim()) {
        return profileDivMatch[1].trim();
      }
    }
    
    const emailMatch = content.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    if (emailMatch?.[1]) {
      const namePart = emailMatch[1].split('@')[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    }
  } catch (error) {
    console.error('Error extracting ChatGPT user name:', error);
  }
  return "User";
}

export function getUserNameClaude(input) {
  try {
    let content;
    if (input instanceof Element || input instanceof Document) {
      content = input.outerHTML || input.documentElement?.outerHTML;
    } else {
      content = input;
    }
    
    const fullNameMatch = content.match(/\\"full_name\\":\\"([^"\\]+)\\"/);
    if (fullNameMatch) {
      return fullNameMatch[1];
    }
    
    if (input instanceof Element || input instanceof Document) {
      const accountName = input.querySelector('div.font-semibold');
      if (accountName) {
        const name = accountName.textContent.trim();
        if (!name.includes('Claude')) {
          return name;
        }
      }
    } else {
      const accountNameMatch = content.match(/<div[^>]*class="[^"]*font-semibold[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (accountNameMatch) {
        const name = accountNameMatch[1].replace(/<[^>]+>/g, '').trim();
        if (!name.includes('Claude')) {
          return name;
        }
      }
    }
  } catch (error) {
    console.error('Error extracting Claude user name:', error);
  }
  return "User";
}

export function getUserNameGemini(input) {
  try {
    let content;
    if (input instanceof Element || input instanceof Document) {
      content = input.outerHTML || input.documentElement?.outerHTML;
    } else {
      content = input;
    }
    
    if (input instanceof Element || input instanceof Document) {
      const userDiv = input.querySelector('div.gb_g');
      if (userDiv) {
        const text = userDiv.textContent.trim();
        if (text) return text;
      }
      const metaTag = input.querySelector('meta[name="og-profile-acct"]');
      if (metaTag) {
        const contentAttr = metaTag.getAttribute('content');
        if (contentAttr) return contentAttr;
      }
    } else {
      const userDivMatch = content.match(/<div[^>]*class="[^"]*gb_g[^"]*"[^>]*>(.*?)<\/div>/is);
      if (userDivMatch) {
        const text = userDivMatch[1].replace(/<[^>]+>/g, '').trim();
        if (text) return text;
      }
      const metaMatch1 = content.match(/<meta[^>]*name="og-profile-acct"[^>]*content="([^"]+)"[^>]*>/i);
      if (metaMatch1) return metaMatch1[1];
      const metaMatch2 = content.match(/<meta[^>]*content="([^"]+)"[^>]*name="og-profile-acct"[^>]*>/i);
      if (metaMatch2) return metaMatch2[1];
    }
  } catch (error) {
    console.error('Error extracting Gemini user name:', error);
  }
  return "User";
}

// --- HELPER FOR MODEL NAME EXTRACTIONS ---

/**
 * Turn a ChatGPT model slug into a display name:
 * "gpt-6-pro" → "GPT-6 Pro", "gpt-4o-mini" → "GPT-4o Mini", "o3" → "O3".
 */
export function formatChatGPTModelSlug(slug) {
  const words = String(slug).split('-').filter(Boolean);
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  if (words[0]?.toLowerCase() === 'gpt' && words.length > 1) {
    return [`GPT-${words[1]}`, ...words.slice(2).map(cap)].join(' ');
  }
  return words.map(cap).join(' ');
}

export function getModelNameChatGPT(input) {
  try {
    let content;
    if (input instanceof Element || input instanceof Document) {
      content = input.outerHTML || input.documentElement?.outerHTML;
    } else {
      content = input;
    }
    
    let model = "ChatGPT";
    
    if (input instanceof Element || input instanceof Document) {
      const selector = input.querySelector('[aria-label*="Model selector, current model is"]');
      if (selector) {
        const ariaLabel = selector.getAttribute('aria-label');
        const match = ariaLabel?.match(/current model is (.*)/);
        if (match) {
          return `GPT-${match[1]}`;
        }
      }
      const slugDiv = input.querySelector('[data-message-model-slug]');
      if (slugDiv) {
        const slug = slugDiv.getAttribute('data-message-model-slug');
        if (slug) return formatChatGPTModelSlug(slug);
      }
    } else {
      const ariaMatch = content.match(/aria-label="[^"]*Model selector, current model is ([^"]+)"/i);
      if (ariaMatch) {
        return `GPT-${ariaMatch[1]}`;
      }
      const slugMatch = content.match(/data-message-model-slug="([^"]+)"/i);
      if (slugMatch) return formatChatGPTModelSlug(slugMatch[1]);
    }
    return model;
  } catch (error) {
    console.error('Error extracting ChatGPT model name:', error);
    return "ChatGPT";
  }
}

/**
 * Extract model name from a ChatGPT backend-api conversation JSON.
 * Uses the model_slug of the most recent assistant message.
 */
export function getModelNameChatGPTFromApi(conversation) {
  try {
    if (!conversation?.mapping) return "ChatGPT";
    let slug = null;
    // Prefer current_node → root walk so we get the model of the latest reply.
    let nodeId = conversation.current_node;
    const seen = new Set();
    while (nodeId && conversation.mapping[nodeId] && !seen.has(nodeId)) {
      seen.add(nodeId);
      const msg = conversation.mapping[nodeId].message;
      if (msg?.author?.role === "assistant" && msg.metadata?.model_slug) {
        slug = msg.metadata.model_slug;
        break;
      }
      nodeId = conversation.mapping[nodeId].parent;
    }
    if (!slug) return "ChatGPT";
    return formatChatGPTModelSlug(slug);
  } catch (error) {
    console.error('Error extracting ChatGPT model name from API:', error);
    return "ChatGPT";
  }
}

export function getModelNameClaude(input) {
  try {
    let content;
    if (input instanceof Element || input instanceof Document) {
      content = input.outerHTML || input.documentElement?.outerHTML;
    } else {
      content = input;
    }
    
    let model = "Claude";
    if (input instanceof Element || input instanceof Document) {
      const dropdown = input.querySelector('[data-testid="model-selector-dropdown"]');
      if (dropdown) {
        // The selector shows the model name in a .truncate span followed by
        // a muted effort badge ("Opus 5.5" + "Extra"); keep only the name.
        const nameEl = dropdown.querySelector('.truncate') || dropdown;
        const text = nameEl.textContent.replace(/\s+/g, ' ').trim();
        if (text) {
          return `Claude ${text}`;
        }
      }
    } else {
      const dropdownMatch = content.match(/data-testid="model-selector-dropdown"[^>]*>([\s\S]*?)<\/[^>]+>/i);
      if (dropdownMatch) {
        const text = dropdownMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text) {
          return `Claude ${text}`;
        }
      }
    }
    return model;
  } catch (error) {
    console.error('Error extracting Claude model name:', error);
    return "Claude";
  }
}

export function getModelNameGemini(input) {
  try {
    let content;
    if (input instanceof Element || input instanceof Document) {
      content = input.outerHTML || input.documentElement?.outerHTML;
    } else {
      content = input;
    }
    
    let model = "Gemini";
    const matches = content.matchAll(/\[\d+,null,null,null,[\\"]*?(Gemini[^\\"]+?)[\\"]*?,null/g);
    const validMatches = [];
    
    for (const match of matches) {
      const modelName = match[1].trim();
      if (modelName.length < 40 && !modelName.includes('<') && !modelName.includes('>')) {
        validMatches.push(modelName);
      }
    }
    if (validMatches.length > 0) {
      return validMatches.reduce((a, b) => a.length > b.length ? a : b);
    }
    if (content.includes('Gemini Advanced')) {
      return "Gemini Advanced";
    }
    return model;
  } catch (error) {
    console.error('Error extracting Gemini model name:', error);
    return "Gemini";
  }
}

/**
 * Extract chat title from Gemini page.
 * Gemini uses the first user query as the chat title.
 * @param {Element|Document|string} input - DOM element or HTML string
 * @returns {string} Chat title or empty string if not found
 */
export function getChatTitleGemini(input) {
  try {
    let doc;
    if (input instanceof Document) {
      doc = input;
    } else if (input instanceof Element) {
      doc = input.ownerDocument || input;
    } else {
      // Parse HTML string
      const parser = new DOMParser();
      doc = parser.parseFromString(input, 'text/html');
    }
    
    // Try to find the first user query in the conversation
    const conversations = doc.querySelectorAll('.conversation-container');
    if (conversations.length > 0) {
      const firstTurn = conversations[0];
      const userQuery = firstTurn.querySelector('user-query, query-text, query-text-line');
      if (userQuery) {
        const queryDiv = userQuery.querySelector('.query-text, .query-text-line');
        const queryText = queryDiv ? queryDiv.textContent.trim() : userQuery.textContent.trim();
        if (queryText) {
          // Truncate long titles and clean up
          let title = queryText.split(/(?<=[.!?])\s+/)[0] || queryText;
          if (title.length > 100) {
            title = title.substring(0, 100) + '...';
          }
          return title.replace(/\n/g, ' ').trim();
        }
      }
    }
    
    // Fallback: try to find any query text element
    const queryText = doc.querySelector('.query-text, .query-text-line');
    if (queryText) {
      let title = queryText.textContent.trim();
      if (title.length > 100) {
        title = title.substring(0, 100) + '...';
      }
      return title.replace(/\n/g, ' ').trim();
    }
    
    return '';
  } catch (error) {
    console.error('Error extracting Gemini chat title:', error);
    return '';
  }
}


// --- HELPER FOR CONTENT EXTRACTIONS ---

/**
 * Centralized logic to fix code fences for Quarto/Pandoc compatibility
 */
export function normalizeCodeBlocks(markdownText) {
  // 1. Fix "Header on previous line" pattern
  markdownText = markdownText.replace(
    /^(?<indent>[ \t]*)(?<lang>[A-Za-z0-9_+]+)\s*\n(?:\k<indent>)```[ \t]*/gmi,
    (match, indent, lang) => {
      indent = indent || "";
      lang = lang.trim().toLowerCase();
      return `\n${indent}\`\`\`{${lang}}`;
    }
  );
  
  // 2. Fix standard fences: ```python -> ```{python}
  markdownText = markdownText.replace(
    /^(?<indent>[ \t]*)\`\`\`(?<lang>[A-Za-z0-9_+.\-]+)\s*$/gm,
    (match, indent, lang) => {
      indent = indent || "";
      lang = lang.trim().toLowerCase();
      
      if (lang === "markdown" || lang === "md") lang = "md";
      if (lang === "c++" || lang === "cpp") lang = "cpp";
      
      return `${indent}\`\`\`{${lang}}`;
    }
  );
  
  // 3. Ensure exactly one empty line before opening fences
  markdownText = markdownText.replace(
    /([^\n])\n([ \t]*\`\`\`{)/g,
    '$1\n\n$2'
  );
  
  // 4. Remove extra newlines before closing fences
  markdownText = markdownText.replace(/\n{2,}\`\`\`/g, '\n```');
  
  return markdownText;
}


/**
 * Recursive converter for HTML to Markdown with strict indentation support for lists.
 */
export function nodeToMarkdown(element, stripTags = ['button', 'img', 'svg']) {
  // 1. Handle Text Nodes
  if (element.nodeType === Node.TEXT_NODE) {
    return element.textContent;
  }
  
  // 2. Element Check
  if (element.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }
  
  const tagName = element.tagName.toLowerCase();
  
  if (stripTags.includes(tagName)) {
    return "";
  }
  
  // 3. Handle Code Blocks
  if (tagName === 'pre') {
    const codeTag = element.querySelector("code");
    if (!codeTag) {
      return `\n\`\`\`\n${element.textContent}\n\`\`\`\n`;
    }
    
    let language = "text";
    const classes = codeTag.className.split(' ');
    for (const cls of classes) {
      if (cls.startsWith("language-")) {
        language = cls.replace("language-", "").toLowerCase();
        break;
      }
    }
    if (language === "text") {
      const headerDiv = element.querySelector('div[class*="bg-token-main-surface-secondary"]');
      if (headerDiv) {
        const headerText = headerDiv.textContent.replace("Copy code", "").replace("Copy", "").trim();
        if (headerText) language = headerText.toLowerCase();
      }
    }
    
    const content = codeTag.textContent;
    return `\n\`\`\`{${language}}\n${content}\n\`\`\`\n`;
  }
  
  // 4. Handle Tables
  if (tagName === 'table') {
    const rows = [];
    const thead = element.querySelector('thead');
    if (thead) {
      const trs = thead.querySelectorAll('tr');
      for (const tr of trs) {
        const cells = Array.from(tr.querySelectorAll('th, td')).map(cell => ` ${cell.textContent.trim()} `);
        rows.push("|" + cells.join("|") + "|");
        rows.push("|" + Array(cells.length).fill("---").join("|") + "|");
      }
    }
    const tbody = element.querySelector('tbody');
    if (tbody) {
      const trs = tbody.querySelectorAll('tr');
      for (const tr of trs) {
        const cells = Array.from(tr.querySelectorAll('td, th')).map(cell => ` ${cell.textContent.trim()} `);
        rows.push("|" + cells.join("|") + "|");
      }
    } else if (!thead) {
      const trs = element.querySelectorAll('tr');
      for (const tr of trs) {
        const cells = Array.from(tr.querySelectorAll('td, th')).map(cell => ` ${cell.textContent.trim()} `);
        rows.push("|" + cells.join("|") + "|");
      }
    }
    return "\n" + rows.join("\n") + "\n\n";
  }

  // 5. Handle Lists (UL / OL) - Pass through
  // processing is handled by the parent or recursing
  if (tagName === 'ul' || tagName === 'ol') {
    const content = Array.from(element.childNodes)
      .map(child => nodeToMarkdown(child, stripTags))
      .join("");
    return content + '\n';
  }

  // 6. Handle List Items (LI) - Strict Indentation
  if (tagName === 'li') {
    const children = Array.from(element.childNodes);
    let itemText = "";
    
    children.forEach(child => {
      let childMd = nodeToMarkdown(child, stripTags);
      
      // FIX: Indent nested lists AND code blocks (pre) to align with list item
      if (child.nodeType === Node.ELEMENT_NODE && 
         (child.tagName.toLowerCase() === 'ul' || 
          child.tagName.toLowerCase() === 'ol' || 
          child.tagName.toLowerCase() === 'pre')) { // <--- Added 'pre' check
         
         // Ensure newline before nested content
         if (!itemText.endsWith('\n')) itemText += '\n';
         
         // Indent every line by 4 spaces
         childMd = childMd.split('\n')
           .map(line => line ? '    ' + line : line)
           .join('\n');
      }
      
      itemText += childMd;
    });
    
    // Determine bullet type
    const parent = element.parentElement;
    const bullet = (parent && parent.tagName.toLowerCase() === 'ol') ? '1.' : '-';
    
    return `${bullet} ${itemText.trim()}\n`;
  }
  
  // 7. Generic Recursive Processing
  const content = Array.from(element.childNodes)
    .map(child => nodeToMarkdown(child, stripTags))
    .join("");
  
  // Headers (source h1–h6 → markdown h3–h8 after +2 shift)
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
    const level = parseInt(tagName[1]) + 2;
    return '#'.repeat(level) + ` ${content}\n\n`;
  }
  
  if (tagName === 'p') return `${content.trim()}\n\n`;
  
  if (tagName === 'a') {
    const href = element.getAttribute('href') || '';
    return `[${content}](${href})`;
  }
  
  if (tagName === 'strong' || tagName === 'b') return `**${content}**`;
  if (tagName === 'em' || tagName === 'i') return `*${content}*`;
  if (tagName === 'code') return `\`${content}\``;
  if (tagName === 'br') return "\n";
  
  return content;
}


// --- CONTENT EXTRACTION FUNCTIONS (ChatGPT, Claude, Gemini) ---

function getRole(element) {
  const authorRole = element.getAttribute('data-message-author-role');
  if (authorRole) return authorRole;
  const turn = element.getAttribute('data-turn');
  if (turn) return turn;
  const roleAttr = element.getAttribute('data-role') || element.getAttribute('role');
  if (roleAttr) return roleAttr;
  if (element.querySelector('[data-message-author-role="user"]')) return "user";
  if (element.querySelector('.markdown') || element.querySelector('[data-message-author-role="assistant"]')) return "assistant";
  return "";
}

function extractUserText(element) {
  const contentDiv = element.querySelector('[data-testid="collapsible-user-message-content"]');
  if (contentDiv) {
    const inner = contentDiv.querySelector('.whitespace-pre-wrap') || contentDiv;
    return inner.textContent.trim();
  }
  const textDiv = element.querySelector('div[data-message-author-role="user"]') ||
                  element.querySelector('.whitespace-pre-wrap');
  if (textDiv) return textDiv.textContent.trim();
  return element.textContent.trim();
}

// ChatGPT marks citations inline with private-use characters, e.g.
// "genui{"citation":{"ref":"turn12search0"}}" (older:
// "citeturn0search3"). Includes leading spaces so a removed
// marker leaves no gap before the punctuation.
const CHATGPT_CITATION_MARKER = /[ \t]*[^]*/g;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Markdown links for one metadata.content_references entry, or ''. */
function chatgptReferenceLinks(ref) {
  const items = Array.isArray(ref.items) && ref.items.length ? ref.items : [ref];
  return items
    .filter(item => typeof item?.url === 'string' && /^https?:\/\//.test(item.url))
    .map(item => {
      let label = item.attribution || item.title || '';
      if (!label) {
        try { label = new URL(item.url).hostname.replace(/^www\./, ''); } catch { label = item.url; }
      }
      return `[${String(label).replace(/[[\]]/g, '')}](${item.url})`;
    })
    .join(' ');
}

/**
 * Replace citation markers with " [source](url)" links where the message
 * metadata maps them to URLs; drop any marker that can't be resolved.
 */
function resolveChatGPTCitations(text, metadata) {
  let out = text;
  for (const ref of metadata?.content_references || []) {
    const marker = ref?.matched_text;
    if (typeof marker !== 'string' || !marker.trim() || !out.includes(marker)) continue;
    const links = chatgptReferenceLinks(ref);
    out = out.replace(new RegExp('[ \\t]*' + escapeRegExp(marker), 'g'), () => (links ? ` ${links}` : ''));
  }
  return out.replace(CHATGPT_CITATION_MARKER, '').replace(/[-]/g, '');
}

/** "&#x20;" / "&#32;" → " " (ChatGPT leaves these in user message text). */
function decodeNumericEntities(text) {
  const decode = (match, code, radix) => {
    try { return String.fromCodePoint(parseInt(code, radix)); } catch { return match; }
  };
  return text
    .replace(/&#x([0-9a-f]+);/gi, (m, hex) => decode(m, hex, 16))
    .replace(/&#(\d+);/g, (m, dec) => decode(m, dec, 10));
}

/**
 * ChatGPT writes math as \( … \) and \[ … \]; Quarto/Pandoc and the PDF
 * renderer expect $ … $ and $$ … $$. Code fences and inline code are left
 * untouched.
 */
export function normalizeMathDelimiters(text) {
  return text
    .split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/)
    .map((part, i) => (i % 2
      ? part
      : part
        .replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => '$$' + tex + '$$')
        .replace(/\\\(([\s\S]+?)\\\)/g, (_, tex) => '$' + tex.trim() + '$')))
    .join('');
}

/**
 * Convert a ChatGPT backend-api conversation JSON into markdown.
 * Walks `current_node` → root via `parent` to recover the visible message
 * branch, then renders user/assistant turns. Bypasses DOM virtualization
 * entirely, so long conversations export in full.
 */
export function parseChatGPTFromApi(conversation, modelName) {
  if (!conversation?.mapping || !conversation?.current_node) return '';

  // Walk from current_node back to root, then reverse to chronological order.
  const path = [];
  let nodeId = conversation.current_node;
  const seen = new Set();
  while (nodeId && conversation.mapping[nodeId] && !seen.has(nodeId)) {
    seen.add(nodeId);
    path.unshift(conversation.mapping[nodeId]);
    nodeId = conversation.mapping[nodeId].parent;
  }

  const messageText = (msg) => {
    if (!msg?.content) return '';
    const { content_type, parts } = msg.content;
    if (!Array.isArray(parts)) return '';
    if (content_type === 'text' || content_type === 'multimodal_text') {
      return parts.filter(p => typeof p === 'string').join('\n');
    }
    // Skip thoughts, tool outputs, code (handled inside text fences), etc.
    return '';
  };

  const outputMd = [];
  // Consecutive assistant messages (e.g. text before and after a tool call)
  // belong to one answer and share a single "Answer" heading.
  let answerOpen = false;
  const closeAnswer = () => {
    if (answerOpen) outputMd.push("\n---\n");
    answerOpen = false;
  };

  for (const node of path) {
    const msg = node.message;
    if (!msg) continue;
    if (msg.metadata?.is_visually_hidden_from_conversation) continue;
    const role = msg.author?.role;
    if (role !== 'user' && role !== 'assistant') continue;
    // Tool calls are addressed to a tool ("web.run", "python", …).
    if (msg.recipient && msg.recipient !== 'all') continue;
    // Progress notes ("Ich prüfe …") and reasoning are sent on the
    // "commentary"/"analysis" channels; ChatGPT shows them in the activity
    // panel, not as part of the answer.
    const channel = msg.channel ?? msg.metadata?.channel;
    if (role === 'assistant' && (channel === 'commentary' || channel === 'analysis')) continue;

    let text = messageText(msg);
    text = role === 'user'
      ? decodeNumericEntities(text).replace(/[ \t]+$/gm, '')
      : normalizeMathDelimiters(resolveChatGPTCitations(text, msg.metadata));
    text = text.trim();
    if (!text) continue;

    if (role === 'user') {
      closeAnswer();
      const first = text.split(/(?<=[.!?])\s+/)[0] || text;
      let h1Title = first.length > 100 ? first.substring(0, 100) + '...' : first;
      h1Title = h1Title.replace(/\n/g, ' ');
      outputMd.push(`# ${h1Title}\n\n`);
      outputMd.push(`${text}\n`);
    } else {
      if (!answerOpen) outputMd.push(`## Answer (${modelName})\n`);
      answerOpen = true;
      // Match the +2 header shift applied by nodeToMarkdown so headings
      // nest under the "Answer" subheader in the rendered PDF.
      const shifted = text.replace(/^(#{1,6}) /gm, (_, hashes) => '#'.repeat(hashes.length + 2) + ' ');
      outputMd.push(`${shifted}\n`);
    }
  }
  closeAnswer();
  return normalizeCodeBlocks(outputMd.join('\n'));
}

export function parseChatGPT(document, modelName) {
  const outputMd = [];
  // ChatGPT now wraps each message in a <div data-message-author-role="...">
  // (older versions used <article>). Query the role-bearing element directly,
  // and fall back to <article> for backwards compatibility.
  let messages = document.querySelectorAll('[data-message-author-role]');
  if (messages.length === 0) {
    messages = document.querySelectorAll('article');
  }

  for (const msg of messages) {
    const role = getRole(msg);

    if (role === "user") {
      let content = extractUserText(msg);
      const match = content.split(/(?<=[.!?])\s+/);
      let h1Title = match[0] || content;
      if (h1Title.length > 100) h1Title = h1Title.substring(0, 100) + "...";
      h1Title = h1Title.replace(/\n/g, ' ');

      outputMd.push(`# ${h1Title}\n\n`);
      outputMd.push(`${content}\n`);
    }
    else if (role === "assistant") {
      outputMd.push(`## Answer (${modelName})\n`);
      const markdownDiv = msg.querySelector('div.markdown');
      let content = markdownDiv ? nodeToMarkdown(markdownDiv) : msg.textContent;
      outputMd.push(`${content}\n`);
      outputMd.push("\n---\n");
    }
  }
  return normalizeCodeBlocks(outputMd.join("\n"));
}

/** Nearest non-empty text before `node` in document order, within `root`. */
function textBefore(node, root) {
  let n = node;
  while (n && n !== root) {
    if (n.previousSibling) {
      n = n.previousSibling;
      while (n.lastChild) n = n.lastChild;
      if (n.nodeType === Node.TEXT_NODE && n.textContent) return n.textContent;
    } else {
      n = n.parentNode;
    }
  }
  return '';
}

/**
 * Return the markdown-bearing part of a Claude assistant message, stripped of
 * UI chrome. Works on a clone so the parsed document is left untouched.
 *
 * Current claude.ai layout (Nov 2026):
 *   [data-testid="assistant-message"]
 *     h3.sr-only                      "Claude responded: ..." (screen reader)
 *     [data-cds="TurnStatus"]         "Searched the web, ran 2 commands" / thinking
 *     [data-cds="Prose"] .standard-markdown   ← the actual answer
 *       a[class*="group/tag"]         citation chips ("kolarivision", "+2")
 *       [data-find-omitted]           code block language label
 *     [data-testid="message-actions"]
 */
function claudeAssistantContent(msg) {
  const clone = msg.cloneNode(true);
  clone.querySelectorAll(
    '[data-find-omitted], .sr-only, [data-cds="TurnStatus"], [data-testid="message-actions"]'
  ).forEach(el => el.remove());

  // Citation chips render as "<label>+N" pills directly after the sentence.
  // Turn them into plain " [label](url)" links.
  clone.querySelectorAll('a[class*="group/tag"]').forEach(a => {
    const label = a.textContent.replace(/\s*\+\d+\s*$/, '').replace(/[[\]]/g, '').trim();
    a.textContent = label || a.getAttribute('href') || '';
    if (!/\s$/.test(textBefore(a, clone))) a.before(' ');
  });

  // Prefer the prose blocks (an answer interleaved with tool calls has
  // several); fall back to the whole cleaned message if the marker changes.
  const prose = Array.from(clone.querySelectorAll('[data-cds="Prose"]'))
    .filter(el => !el.parentElement?.closest('[data-cds="Prose"]'));
  return prose.length ? prose : [clone];
}

export function parseClaude(document, modelName) {
  const outputMd = [];
  const isAssistant = (el) =>
    el.getAttribute('data-testid') === 'assistant-message' ||
    el.classList.contains('font-claude-response');

  let messages = document.querySelectorAll(
    '[data-testid="user-message"], [data-testid="assistant-message"]'
  );
  if (!document.querySelector('[data-testid="assistant-message"]')) {
    // Pre-Nov-2026 layout wrapped answers in div.font-claude-response.
    messages = document.querySelectorAll('div[data-testid="user-message"], div.font-claude-response');
  }

  for (const msg of messages) {
    if (!isAssistant(msg)) {
      // User messages are one <p> per paragraph; textContent would glue them
      // together without a separator.
      const content = nodeToMarkdown(msg).replace(/\n\s*\n/g, '\n\n').trim();
      const plain = (msg.querySelector('p') || msg).textContent.trim();
      const match = plain.split(/(?<=[.!?])\s+/);
      let h1Title = match[0] || plain;
      if (h1Title.length > 100) h1Title = h1Title.substring(0, 100) + "...";
      h1Title = h1Title.replace(/\n/g, ' ');
      outputMd.push(`# ${h1Title}\n\n${content}\n`);
    }
    else {
      outputMd.push(`## ${modelName}\n`);
      const rawMd = claudeAssistantContent(msg)
        .map(el => nodeToMarkdown(el))
        .join('\n\n');
      const shiftedMd = rawMd.replace(/^(#{1,8}) /gm, '##$1 ');
      const cleanMd = shiftedMd.replace(/\n\s*\n/g, '\n\n');
      outputMd.push(`${cleanMd}\n`);
      outputMd.push("\n---\n");
    }
  }
  return normalizeCodeBlocks(outputMd.join("\n"));
}

export function parseGemini(document, modelName) {
  const outputMd = [];
  const conversations = document.querySelectorAll('.conversation-container');
  
  for (const turn of conversations) {
    const uComp = turn.querySelector('user-query, query-text, query-text-line');
    if (!uComp) continue;
    
    const qDiv = uComp.querySelector('.query-text, .query-text-line');
    const qText = qDiv ? qDiv.textContent.trim() : uComp.textContent.trim();
    const match = qText.split(/(?<=[.!?])\s+/);
    let h1Title = match[0] || qText;
    if (h1Title.length > 100) h1Title = h1Title.substring(0, 100) + "...";
    h1Title = h1Title.replace(/\n/g, ' ');
    
    outputMd.push(`# ${h1Title}\n\n${qText}\n`);
    
    const mComp = turn.querySelector('model-response, model-response-container');
    if (mComp) {
      outputMd.push(`## ${modelName}\n`);
      const mdDiv = mComp.querySelector('.markdown');
      if (mdDiv) {
        const codeHeaders = mdDiv.querySelectorAll('.code-block-header');
        for (const header of codeHeaders) {
          const lang = header.textContent.trim().toLowerCase();
          let nextElement = header.nextElementSibling;
          while (nextElement && nextElement.tagName.toLowerCase() !== 'pre') {
            nextElement = nextElement.nextElementSibling;
          }
          if (nextElement) {
            const code = nextElement.querySelector('code');
            if (code) {
              const currentClasses = code.className || '';
              code.className = currentClasses + ` language-${lang}`;
            }
          }
          header.remove();
        }
        const rawMd = nodeToMarkdown(mdDiv);
        const shifted = rawMd.replace(/^(#{1,8}) /gm, '##$1 ');
        outputMd.push(`${shifted}\n`);
      } else {
        outputMd.push("_No text response found._\n");
      }
      
      const footer = mComp.querySelector('.response-container-footer');
      if (footer) {
        const footerText = footer.textContent.trim();
        if (footerText) outputMd.push(`\n> *Note: ${footerText}*\n`);
      }
    }
    outputMd.push("\n---\n");
  }
  return normalizeCodeBlocks(outputMd.join("\n"));
}