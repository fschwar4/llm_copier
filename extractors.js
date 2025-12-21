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
      const ariaMatch = content.match(/aria-label="[^"]*Model selector, current model is ([^"]+)"/i);
      if (ariaMatch) {
        return `GPT-${ariaMatch[1]}`;
      }
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
        const text = dropdown.textContent.trim();
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
  
  // Headers
  if (['h1', 'h2', 'h3', 'h4'].includes(tagName)) {
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

function getRole(article) {
  const roleAttr = article.getAttribute('data-role') || article.getAttribute('role');
  if (roleAttr) return roleAttr;
  if (article.querySelector('[data-message-author-role="user"]')) return "user";
  if (article.querySelector('.markdown') || article.querySelector('[data-message-author-role="assistant"]')) return "assistant";
  return "";
}

function extractUserText(article) {
  const textDiv = article.querySelector('div[data-message-author-role="user"]') ||
                  article.querySelector('.whitespace-pre-wrap');
  if (textDiv) return textDiv.textContent.trim();
  return article.textContent.trim();
}

export function parseChatGPT(document, modelName) {
  const outputMd = [];
  const articles = document.querySelectorAll("article");
  
  for (const art of articles) {
    const role = getRole(art);
    
    if (role === "user") {
      let content = extractUserText(art);
      const match = content.split(/(?<=[.!?])\s+/);
      let h1Title = match[0] || content;
      if (h1Title.length > 100) h1Title = h1Title.substring(0, 100) + "...";
      h1Title = h1Title.replace(/\n/g, ' ');
      
      outputMd.push(`# ${h1Title}\n\n`);
      outputMd.push(`${content}\n`);
    }
    else if (role === "assistant") {
      outputMd.push(`## Answer (${modelName})\n`);
      const markdownDiv = art.querySelector('div.markdown');
      let content = markdownDiv ? nodeToMarkdown(markdownDiv) : art.textContent;
      outputMd.push(`${content}\n`);
      outputMd.push("\n---\n");
    }
  }
  return normalizeCodeBlocks(outputMd.join("\n"));
}

export function parseClaude(document, modelName) {
  const outputMd = [];
  const messages = document.querySelectorAll('div[data-testid="user-message"], div.font-claude-response');
  
  for (const msg of messages) {
    if (msg.getAttribute('data-testid') === 'user-message') {
      const content = msg.textContent.trim();
      const match = content.split(/(?<=[.!?])\s+/);
      let h1Title = match[0] || content;
      if (h1Title.length > 100) h1Title = h1Title.substring(0, 100) + "...";
      h1Title = h1Title.replace(/\n/g, ' ');
      outputMd.push(`# ${h1Title}\n\n${content}\n`);
    }
    else {
      outputMd.push(`## ${modelName}\n`);
      const rawMd = nodeToMarkdown(msg);
      const shiftedMd = rawMd.replace(/^(#{1,6}) /gm, '##$1 ');
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
        const shifted = rawMd.replace(/^(#{1,6}) /gm, '##$1 ');
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