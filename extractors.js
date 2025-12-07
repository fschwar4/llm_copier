// --- HELPER FOR USER NAME EXTRACTIONS ---

/**
 * Extract user name from ChatGPT HTML content
 * @param {Element|Document|string} input - DOM element or HTML string
 * @returns {string} User name or "User" if not found
 */
export function getUserNameChatGPT(input) {
  try {
    let content;
    
    // Convert to string if it's a DOM element
    if (input instanceof Element || input instanceof Document) {
      content = input.outerHTML || input.documentElement?.outerHTML;
    } else {
      content = input;
    }
    
    // 1. Try user-menu-button (DOM method if available)
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
      // String regex fallback
      const userMenuMatch = content.match(/data-testid="user-menu-button"[^>]*>([^<]+)</);
      if (userMenuMatch?.[1]?.trim()) {
        return userMenuMatch[1].trim();
      }
      
      const profileDivMatch = content.match(/<div[^>]*class="[^"]*user-name[^"]*"[^>]*>([^<]+)</i);
      if (profileDivMatch?.[1]?.trim()) {
        return profileDivMatch[1].trim();
      }
    }
    
    // 2. Email fallback (works with both DOM and string)
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

/**
 * Extract user name from Claude HTML content
 * @param {Element|Document|string} input - DOM element or HTML string
 * @returns {string} User name or "User" if not found
 */
export function getUserNameClaude(input) {
  try {
    let content;
    
    // Convert to string if it's a DOM element
    if (input instanceof Element || input instanceof Document) {
      content = input.outerHTML || input.documentElement?.outerHTML;
    } else {
      content = input;
    }
    
    // 1. Try JSON pattern (escaped full_name)
    const fullNameMatch = content.match(/\\"full_name\\":\\"([^"\\]+)\\"/);
    if (fullNameMatch) {
      return fullNameMatch[1];
    }
    
    // 2. Try font-semibold div (DOM method if available)
    if (input instanceof Element || input instanceof Document) {
      const accountName = input.querySelector('div.font-semibold');
      if (accountName) {
        const name = accountName.textContent.trim();
        if (!name.includes('Claude')) {
          return name;
        }
      }
    } else {
      // String regex fallback
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

/**
 * Extract user name from Gemini HTML content
 * @param {Element|Document|string} input - DOM element or HTML string
 * @returns {string} User name or "User" if not found
 */
export function getUserNameGemini(input) {
  try {
    let content;
    
    // Convert to string if it's a DOM element
    if (input instanceof Element || input instanceof Document) {
      content = input.outerHTML || input.documentElement?.outerHTML;
    } else {
      content = input;
    }
    
    // 1. Google Account top bar indicator (DOM method if available)
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
      // String regex fallback
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
 * Extract model name from ChatGPT HTML content
 * @param {Element|Document|string} input - DOM element or HTML string
 * @returns {string} Model name (e.g., "GPT-4o", "ChatGPT")
 */
export function getModelNameChatGPT(input) {
  try {
    let content;
    
    // Convert to string if it's a DOM element
    if (input instanceof Element || input instanceof Document) {
      content = input.outerHTML || input.documentElement?.outerHTML;
    } else {
      content = input;
    }
    
    let model = "ChatGPT";
    
    // 1. Try model selector aria-label (DOM method if available)
    if (input instanceof Element || input instanceof Document) {
      const selector = input.querySelector('[aria-label*="Model selector, current model is"]');
      if (selector) {
        const ariaLabel = selector.getAttribute('aria-label');
        const match = ariaLabel?.match(/current model is (.*)/);
        if (match) {
          return `GPT-${match[1]}`;
        }
      }
      
      // 2. Fallback to data-message-model-slug
      const slugDiv = input.querySelector('[data-message-model-slug]');
      if (slugDiv) {
        const slug = slugDiv.getAttribute('data-message-model-slug');
        if (slug) {
          return slug
            .replace(/gpt-/i, 'GPT-')
            .replace(/-/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        }
      }
    } else {
      // String regex fallback
      // Try aria-label pattern
      const ariaMatch = content.match(/aria-label="[^"]*Model selector, current model is ([^"]+)"/i);
      if (ariaMatch) {
        return `GPT-${ariaMatch[1]}`;
      }
      
      // Try data-message-model-slug
      const slugMatch = content.match(/data-message-model-slug="([^"]+)"/i);
      if (slugMatch) {
        const slug = slugMatch[1];
        return slug
          .replace(/gpt-/i, 'GPT-')
          .replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
    }
    
    return model;
  } catch (error) {
    console.error('Error extracting ChatGPT model name:', error);
    return "ChatGPT";
  }
}

/**
 * Extract model name from Claude HTML content
 * @param {Element|Document|string} input - DOM element or HTML string
 * @returns {string} Model name (e.g., "Claude Sonnet 3.5", "Claude")
 */
export function getModelNameClaude(input) {
  try {
    let content;
    
    // Convert to string if it's a DOM element
    if (input instanceof Element || input instanceof Document) {
      content = input.outerHTML || input.documentElement?.outerHTML;
    } else {
      content = input;
    }
    
    let model = "Claude";
    
    // Try model selector dropdown (DOM method if available)
    if (input instanceof Element || input instanceof Document) {
      const dropdown = input.querySelector('[data-testid="model-selector-dropdown"]');
      if (dropdown) {
        const text = dropdown.textContent.trim();
        if (text) {
          return `Claude ${text}`;
        }
      }
    } else {
      // String regex fallback
      const dropdownMatch = content.match(/data-testid="model-selector-dropdown"[^>]*>([\s\S]*?)<\/[^>]+>/i);
      if (dropdownMatch) {
        // Remove HTML tags and get text
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

/**
 * Extract model name from Gemini HTML content
 * @param {Element|Document|string} input - DOM element or HTML string
 * @returns {string} Model name (e.g., "Gemini Advanced", "Gemini")
 */
export function getModelNameGemini(input) {
  try {
    let content;
    
    // Convert to string if it's a DOM element
    if (input instanceof Element || input instanceof Document) {
      content = input.outerHTML || input.documentElement?.outerHTML;
    } else {
      content = input;
    }
    
    let model = "Gemini";
    
    // 1. Try to find Gemini model name in the content
    // Pattern: [number,null,null,null,"Gemini [model name]",null
    // Or with escaped quotes: [number,null,null,null,\"Gemini [model name]\",null
    const matches = content.matchAll(/\[\d+,null,null,null,[\\"]*?(Gemini[^\\"]+?)[\\"]*?,null/g);
    const validMatches = [];
    
    for (const match of matches) {
      const modelName = match[1].trim();
      // Filter: length < 40 and doesn't contain weird characters
      if (modelName.length < 40 && !modelName.includes('<') && !modelName.includes('>')) {
        validMatches.push(modelName);
      }
    }
    
    // Take the longest valid match (usually most specific)
    if (validMatches.length > 0) {
      return validMatches.reduce((a, b) => a.length > b.length ? a : b);
    }
    
    // 2. Fallback to "Gemini Advanced" if found
    if (content.includes('Gemini Advanced')) {
      return "Gemini Advanced";
    }
    
    return model;
  } catch (error) {
    console.error('Error extracting Gemini model name:', error);
    return "Gemini";
  }
}


// --- HELPER FOR CONTENT EXTRACTIONS ---
/**
 * Centralized logic to fix code fences for Quarto/Pandoc compatibility
 * @param {string} markdownText - Markdown text to normalize
 * @returns {string} Normalized markdown text
 */
export function normalizeCodeBlocks(markdownText) {
  // 1. Fix "Header on previous line" pattern
  // Pattern: language\n``` -> ```{language}
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
      
      // Normalize language names
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
 * Recursive converter for HTML to Markdown with optional element filtering
 * @param {Node} element - DOM node to convert
 * @param {string[]} stripTags - Array of tag names to skip (default: ['button', 'img', 'svg'])
 * @returns {string} Markdown representation
 */
export function nodeToMarkdown(element, stripTags = ['button', 'img', 'svg']) {
  // Handle text nodes
  if (element.nodeType === Node.TEXT_NODE) {
    return element.textContent;
  }
  
  // Not an element node
  if (element.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }
  
  const tagName = element.tagName.toLowerCase();
  
  // Skip stripped tags (NEW - works for both ChatGPT and Claude)
  if (stripTags.includes(tagName)) {
    return "";
  }
  
  // Handle Code Blocks
  if (tagName === 'pre') {
    const codeTag = element.querySelector("code");
    
    if (!codeTag) {
      return `\n\`\`\`\n${element.textContent}\n\`\`\`\n`;
    }
    
    let language = "text";
    
    // Check for language class
    const classes = codeTag.className.split(' ');
    for (const cls of classes) {
      if (cls.startsWith("language-")) {
        language = cls.replace("language-", "").toLowerCase();
        break;
      }
    }
    
    // If still "text", check header div
    if (language === "text") {
      const headerDiv = element.querySelector('div[class*="bg-token-main-surface-secondary"]');
      if (headerDiv) {
        const headerText = headerDiv.textContent
          .trim()
          .replace("Copy code", "")
          .replace("Copy", "")
          .trim();
        if (headerText) {
          language = headerText.toLowerCase();
        }
      }
    }
    
    const content = codeTag.textContent;
    return `\n\`\`\`{${language}}\n${content}\n\`\`\`\n`;
  }
  
  // Handle Tables
  if (tagName === 'table') {
    const rows = [];
    
    const thead = element.querySelector('thead');
    if (thead) {
      const trs = thead.querySelectorAll('tr');
      for (const tr of trs) {
        const cells = Array.from(tr.querySelectorAll('th, td'))
          .map(cell => ` ${cell.textContent.trim()} `);
        rows.push("|" + cells.join("|") + "|");
        rows.push("|" + Array(cells.length).fill("---").join("|") + "|");
      }
    }
    
    const tbody = element.querySelector('tbody');
    if (tbody) {
      const trs = tbody.querySelectorAll('tr');
      for (const tr of trs) {
        const cells = Array.from(tr.querySelectorAll('td, th'))
          .map(cell => ` ${cell.textContent.trim()} `);
        rows.push("|" + cells.join("|") + "|");
      }
    } else if (!thead) {
      const trs = element.querySelectorAll('tr');
      for (const tr of trs) {
        const cells = Array.from(tr.querySelectorAll('td, th'))
          .map(cell => ` ${cell.textContent.trim()} `);
        rows.push("|" + cells.join("|") + "|");
      }
    }
    
    return "\n" + rows.join("\n") + "\n\n";
  }
  
  // General Tags - recurse through children
  const content = Array.from(element.childNodes)
    .map(child => nodeToMarkdown(child, stripTags))  // Pass stripTags to children
    .join("");
  
  // Shift Headers: H1 -> H3, H2 -> H4 to nest under "## Answer"
  if (['h1', 'h2', 'h3', 'h4'].includes(tagName)) {
    const level = parseInt(tagName[1]) + 2;
    return '#'.repeat(level) + ` ${content}\n\n`;
  }
  
  if (tagName === 'p') return `${content.trim()}\n\n`;
  if (tagName === 'ul' || tagName === 'ol') return `${content}\n`;
  
  if (tagName === 'li') {
    const parent = element.parentElement;
    if (parent && parent.tagName.toLowerCase() === 'ol') {
      return `1. ${content.trim()}\n`;
    } else {
      return `- ${content.trim()}\n`;
    }
  }
  
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


// --- CONTENT EXTRACTION FOR CHATGPT ---
/**
 * Get role attribute from article element
 * Fixed to support modern ChatGPT DOM where role is nested in children
 * @param {Element} article - Article element
 * @returns {string} Role ("user" or "assistant")
 */
function getRole(article) {
  // 1. Check direct attributes (Legacy / some layouts)
  const roleAttr = article.getAttribute('data-role') || article.getAttribute('role');
  if (roleAttr) return roleAttr;

  // 2. Check for User specific element (Nested div)
  // ChatGPT usually marks user messages with data-message-author-role="user"
  if (article.querySelector('[data-message-author-role="user"]')) {
    return "user";
  }

  // 3. Check for Assistant specific elements
  // Assistant messages usually contain .markdown or data-message-author-role="assistant"
  if (article.querySelector('.markdown') || article.querySelector('[data-message-author-role="assistant"]')) {
    return "assistant";
  }

  // 4. Fallback: Check if it's a system/error message (optional, usually ignored)
  return "";
}

/**
 * Extract user text from article element
 * @param {Element} article - Article element
 * @returns {string} User message text
 */
function extractUserText(article) {
  // Look for the text content in the article
  // ChatGPT usually has user text in a specific div structure
  const textDiv = article.querySelector('div[data-message-author-role="user"]') ||
                  article.querySelector('.whitespace-pre-wrap');
  
  if (textDiv) {
    return textDiv.textContent.trim();
  }
  
  return article.textContent.trim();
}



/**
 * Parse ChatGPT HTML into markdown content (without YAML header)
 * @param {Document|Element} document - DOM document or element containing ChatGPT conversation
 * @param {string} modelName - Model name for Answer headers
 * @returns {string} Formatted markdown content
 */
export function parseChatGPT(document, modelName) {
  const outputMd = [];
  
  // Process Articles
  const articles = document.querySelectorAll("article");
  
  for (const art of articles) {
    const role = getRole(art);
    
    if (role === "user") {
      let content = extractUserText(art);
      
      const match = content.split(/(?<=[.!?])\s+/);
      let h1Title = match[0] || content;
      
      if (h1Title.length > 100) {
        h1Title = h1Title.substring(0, 100) + "...";
      }
      h1Title = h1Title.replace(/\n/g, ' ');
      
      outputMd.push(`# ${h1Title}\n\n`);
      outputMd.push(`${content}\n`);
    }
    else if (role === "assistant") {
      outputMd.push(`## Answer (${modelName})\n`);
      
      const markdownDiv = art.querySelector('div.markdown');
      let content;
      
      if (markdownDiv) {
        // Uses enhanced nodeToMarkdown with default stripTags
        content = nodeToMarkdown(markdownDiv);
      } else {
        content = art.textContent;
      }
      
      outputMd.push(`${content}\n`);
      outputMd.push("\n---\n");
    }
  }
  
  return normalizeCodeBlocks(outputMd.join("\n"));
}


// --- CONTENT EXTRACTION FOR CLAUDE ---
/**
 * Parse Claude HTML into markdown content (without YAML header)
 * @param {Document|Element} document - DOM document or element containing Claude conversation
 * @param {string} modelName - Model name for Answer headers
 * @returns {string} Formatted markdown content
 */
export function parseClaude(document, modelName) {
  const outputMd = [];
  
  const messages = document.querySelectorAll('div[data-testid="user-message"], div.font-claude-response');
  
  for (const msg of messages) {
    // No need to manually remove buttons anymore - nodeToMarkdown handles it!
    
    if (msg.getAttribute('data-testid') === 'user-message') {
      const content = msg.textContent.trim();
      const match = content.split(/(?<=[.!?])\s+/);
      let h1Title = match[0] || content;
      
      if (h1Title.length > 100) {
        h1Title = h1Title.substring(0, 100) + "...";
      }
      h1Title = h1Title.replace(/\n/g, ' ');
      
      outputMd.push(`# ${h1Title}\n\n${content}\n`);
    }
    else {
      outputMd.push(`## ${modelName}\n`);
      
      // Uses enhanced nodeToMarkdown with default stripTags
      const rawMd = nodeToMarkdown(msg);
      
      const shiftedMd = rawMd.replace(/^(#{1,6}) /gm, '##$1 ');
      const cleanMd = shiftedMd.replace(/\n\s*\n/g, '\n\n');
      
      outputMd.push(`${cleanMd}\n`);
      outputMd.push("\n---\n");
    }
  }
  
  return normalizeCodeBlocks(outputMd.join("\n"));
}


// --- CONTENT EXTRACTION FOR GEMINI ---
/**
 * Parse Gemini HTML into markdown content (without YAML header)
 * @param {Document|Element} document - DOM document or element containing Gemini conversation
 * @param {string} modelName - Model name for Answer headers
 * @returns {string} Formatted markdown content
 */
export function parseGemini(document, modelName) {
  const outputMd = [];
  
  // Find all conversation containers
  const conversations = document.querySelectorAll('.conversation-container');
  
  for (const turn of conversations) {
    // --- User Query (H1) ---
    // Try to find user query component with various possible tag names
    const uComp = turn.querySelector('user-query, query-text, query-text-line');
    if (!uComp) continue;
    
    // Try to find nested query text
    const qDiv = uComp.querySelector('.query-text, .query-text-line');
    const qText = qDiv ? qDiv.textContent.trim() : uComp.textContent.trim();
    
    // Generate H1 header for TOC
    const match = qText.split(/(?<=[.!?])\s+/);
    let h1Title = match[0] || qText;
    
    if (h1Title.length > 100) {
      h1Title = h1Title.substring(0, 100) + "...";
    }
    h1Title = h1Title.replace(/\n/g, ' ');
    
    outputMd.push(`# ${h1Title}\n\n${qText}\n`);
    
    // --- Model Response (H2) ---
    const mComp = turn.querySelector('model-response, model-response-container');
    if (mComp) {
      outputMd.push(`## ${modelName}\n`);
      
      const mdDiv = mComp.querySelector('.markdown');
      if (mdDiv) {
        // Fix headers for code blocks - find code-block-header elements
        const codeHeaders = mdDiv.querySelectorAll('.code-block-header');
        for (const header of codeHeaders) {
          const lang = header.textContent.trim().toLowerCase();
          
          // Find the next sibling pre element
          let nextElement = header.nextElementSibling;
          while (nextElement && nextElement.tagName.toLowerCase() !== 'pre') {
            nextElement = nextElement.nextElementSibling;
          }
          
          if (nextElement) {
            const code = nextElement.querySelector('code');
            if (code) {
              // Add language class to code element
              const currentClasses = code.className || '';
              code.className = currentClasses + ` language-${lang}`;
            }
          }
          
          // Remove the header element
          header.remove();
        }
        
        // Convert to markdown
        const rawMd = nodeToMarkdown(mdDiv);
        
        // Shift internal headers down by 2 levels
        // # -> ###, ## -> ####, etc.
        const shifted = rawMd.replace(/^(#{1,6}) /gm, '##$1 ');
        
        outputMd.push(`${shifted}\n`);
      } else {
        outputMd.push("_No text response found._\n");
      }
      
      // Check for footer notes
      const footer = mComp.querySelector('.response-container-footer');
      if (footer) {
        const footerText = footer.textContent.trim();
        if (footerText) {
          outputMd.push(`\n> *Note: ${footerText}*\n`);
        }
      }
    }
    
    outputMd.push("\n---\n");
  }
  
  return normalizeCodeBlocks(outputMd.join("\n"));
}
