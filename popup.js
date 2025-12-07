// popup.js

document.addEventListener('DOMContentLoaded', () => {
  console.log('[LLM Copier] Popup DOMContentLoaded');
  
  const statusEl = document.getElementById('status');
  const copyBtn = document.getElementById('copy-btn');
  const pdfBtn = document.getElementById('pdf-btn');
  const domBtn = document.getElementById('dom-btn');

  // --- 1. CORE VALIDATION ---

  async function getActiveLLMTab() {
    console.log('[LLM Copier] Querying active tab...');
    statusEl.textContent = '';
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      console.error('[LLM Copier] No active tab found');
      statusEl.style.color = 'red';
      statusEl.textContent = 'No active tab found.';
      return null;
    }

    const url = tab.url || '';
    console.log('[LLM Copier] Active tab URL:', url);

    const isAllowed =
      /^https?:\/\/chatgpt\.com\//.test(url) ||
      /^https?:\/\/gemini\.google\.com\//.test(url) ||
      /^https?:\/\/claude\.ai\//.test(url);

    if (!isAllowed) {
      console.warn('[LLM Copier] URL not supported:', url);
      statusEl.style.color = 'red';
      statusEl.textContent = "Can only copy from supported LLM URLs";
      return null;
    }

    console.log('[LLM Copier] Valid LLM tab found:', tab.id);
    return tab;
  }

  // --- 2. EXTRACTION LOGIC (Runs in the Browser Tab) ---
  
  async function extractData(tabId, format = 'html') {
    console.log(`[LLM Copier] Injecting extraction script (Format: ${format}) into tab:`, tabId);
    
    try {
      const [{ result }] = await browser.scripting.executeScript({
        target: { tabId: tabId },
        args: [format],
        func: (requestedFormat) => {
          console.log('[LLM Content Script] Extraction started for:', requestedFormat);
          
          const url = window.location.href;
          const today = new Date().toISOString().split('T')[0];
          let pageTitle = document.title || 'Chat Export';
          
          // FIX: Initialize company variable
          let company = 'Unknown AI'; 
          let modelName = 'LLM';
          let userName = 'User';
          let platform = 'unknown';

          // Improved Model Detection based on Domain
          if (url.includes('chatgpt.com')) {
            platform = 'chatgpt';
            company = 'OpenAI'; // FIX: Assign company
            modelName = 'ChatGPT';
          } else if (url.includes('claude.ai')) {
            platform = 'claude';
            company = 'Anthropic'; // FIX: Assign company
            modelName = 'Claude';
          } else if (url.includes('gemini.google.com')) {
            platform = 'gemini';
            company = 'Google'; // FIX: Assign company
            modelName = 'Gemini';
          }
          
          // --- A. MARKDOWN EXTRACTION (For Copy to Clipboard) ---
          if (requestedFormat === 'markdown') {
            function nodeToMarkdown(node) {
                if (!node) return '';
                if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
                if (node.nodeType !== Node.ELEMENT_NODE) return '';

                // Ignore hidden/UI
                if (node.style.display === 'none' || node.getAttribute('aria-hidden') === 'true') return '';
                const tag = node.tagName.toLowerCase();
                
                // Skip UI elements
                if (['button', 'svg', 'script', 'style', 'noscript', 'img'].includes(tag)) return '';
                // Skip header on code blocks to avoid duplication
                if (node.classList.contains('code-block-header') || node.innerText === 'Copy code') return ''; 

                let content = "";
                node.childNodes.forEach(child => content += nodeToMarkdown(child));

                switch (tag) {
                    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
                        const level = Math.min(parseInt(tag[1]) + 2, 6); 
                        return `\n\n${'#'.repeat(level)} ${content.trim()}\n\n`;
                    case 'p': return `\n\n${content.trim()}\n\n`;
                    case 'br': return '  \n';
                    case 'strong': case 'b': return `**${content}**`;
                    case 'em': case 'i': return `*${content}*`;
                    case 'code': 
                         if (node.parentElement && node.parentElement.tagName === 'PRE') return content;
                         return `\`${content}\``;
                    case 'pre':
                        return `\n\n\`\`\`\n${content}\n\`\`\`\n\n`;
                    case 'a':
                        const href = node.getAttribute('href');
                        return href ? `[${content}](${href})` : content;
                    case 'ul': return `\n${content}\n`;
                    case 'ol': return `\n${content}\n`;
                    case 'li':
                        const parent = node.parentElement;
                        const idx = parent && parent.tagName === 'OL' ? '1.' : '-';
                        return `${idx} ${content.trim()}\n`;
                    case 'table':
                        const rows = Array.from(node.querySelectorAll('tr'));
                        if (!rows.length) return '';
                        let tableMd = '\n\n';
                        rows.forEach((tr, i) => {
                            const cells = Array.from(tr.querySelectorAll('th, td')).map(c => c.textContent.trim().replace(/\|/g, '\\|'));
                            tableMd += '| ' + cells.join(' | ') + ' |\n';
                            if (i === 0) tableMd += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
                        });
                        return tableMd + '\n';
                    default: return content;
                }
            }

            let md = "";
            if (platform === 'chatgpt') {
                document.querySelectorAll('article').forEach(art => {
                    const isUser = art.querySelector('[data-message-author-role="user"]');
                    md += isUser ? `# User\n` : `# ChatGPT\n`;
                    const contentEl = art.querySelector('.markdown') || art;
                    md += nodeToMarkdown(contentEl) + "\n\n---\n\n";
                });
            } else if (platform === 'claude') {
                document.querySelectorAll('div[data-testid="user-message"], div.font-claude-response').forEach(msg => {
                    const isUser = msg.getAttribute('data-testid') === 'user-message';
                    md += isUser ? `# User\n` : `# Claude\n`;
                    md += nodeToMarkdown(msg) + "\n\n---\n\n";
                });
            } else if (platform === 'gemini') {
                document.querySelectorAll('user-query, model-response').forEach(el => {
                    const isUser = el.tagName === 'USER-QUERY';
                    md += isUser ? `# User\n` : `# Gemini\n`;
                    md += nodeToMarkdown(el) + "\n\n---\n\n";
                });
            }

             const yaml =
              '---\n' +
              `title: "${pageTitle.replace(/"/g, '\\"')}"\n` +
              `date: "${today}"\n` +
              `author: "${company} - ${modelName} & ${userName}"\n` +
              'format:\n  pdf:\n    toc: true\n    number-sections: true\n    mainfont: "Avenir"\n---\n\n';

            return { markdown: yaml + md };
          }
          
          // --- B. HTML EXTRACTION (For PDF) ---
          else {
              const messageChunks = [];
              let selectorString = '';

              if (platform === 'chatgpt') {
                  selectorString = 'article';
              } else if (platform === 'claude') {
                  selectorString = 'div[data-testid="user-message"], div.font-claude-response';
              } else if (platform === 'gemini') {
                  selectorString = 'user-query, model-response';
              }

              if (selectorString) {
                  const elements = document.querySelectorAll(selectorString);
                  elements.forEach(el => {
                      const clone = el.cloneNode(true);

                      const junkSelectors = [
                          'button', 'svg', 'img', 
                          '[role="button"]', 
                          '.sr-only', 
                          'div.flex-shrink-0'
                      ];
                      junkSelectors.forEach(sel => {
                          clone.querySelectorAll(sel).forEach(junk => junk.remove());
                      });
                      
                      let role = 'Unknown';
                      if(platform === 'chatgpt') {
                          role = clone.querySelector('[data-message-author-role="user"]') ? 'User' : 'ChatGPT';
                      } else if (platform === 'claude') {
                          role = clone.getAttribute('data-testid') === 'user-message' ? 'User' : 'Claude';
                      } else if (platform === 'gemini') {
                          role = clone.tagName === 'USER-QUERY' ? 'User' : 'Gemini';
                      }

                      const wrapper = document.createElement('div');
                      wrapper.style.marginBottom = '20px';
                      wrapper.style.borderBottom = '1px solid #ccc';
                      
                      const header = document.createElement('h3');
                      header.textContent = role;
                      header.style.color = '#333';
                      header.style.marginTop = '20px';
                      
                      wrapper.appendChild(header);
                      wrapper.appendChild(clone);
                      
                      messageChunks.push({
                          html: wrapper.outerHTML,
                          role: role
                      });
                  });
              }

              return {
                  chunks: messageChunks,
                  meta: {
                    title: pageTitle, 
                    date: today, 
                    // FIX: Ensure company and model are returned for the PDF handler
                    company: company,
                    model: modelName,
                    author: `${company} - ${modelName} & ${userName}` 
                  }
              };
          }
        },
      });
      
      return result;
      
    } catch (e) {
      console.error('[LLM Copier] Script injection failed:', e);
      throw e;
    }
  }

  // --- 3. COMMON STYLES ---
  
  function getCommonStyles() {
    return `
      /* Reset basic elements to black on white */
      body, div, p, span, li, td, th { color: #000000 !important; background-color: transparent !important; }
      
      /* Headers */
      h1, h2, h3 { color: #000 !important; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
      
      /* Code Blocks */
      pre { 
          background-color: #f6f8fa !important; 
          border: 1px solid #d1d5da !important;
          padding: 10px; 
          border-radius: 4px; 
          white-space: pre-wrap; 
          word-wrap: break-word;
          font-family: monospace;
          color: #24292e !important;
          max-width: 100%;
          overflow-x: hidden;
      }
      code {
          background-color: #f6f8fa !important;
          color: #24292e !important;
          font-family: monospace;
          word-break: break-word;
      }

      /* Tables */
      table { border-collapse: collapse; width: 100%; margin: 15px 0; }
      th, td { border: 1px solid #ccc !important; padding: 8px; text-align: left; }
      th { background-color: #f0f0f0 !important; font-weight: bold; }

      /* Meta Box */
      .meta-box { 
          background-color: #f9f9f9 !important; 
          border-left: 5px solid #333 !important; 
          padding: 15px; 
          margin-bottom: 30px; 
          font-size: 14px; 
      }

      /* Message chunks */
      .message-chunk {
          page-break-inside: avoid;
          margin-bottom: 15px;
      }
    `;
  }

  // --- 4. PDF GENERATION (Chunked using html2pdf's worker API) ---

  async function generatePdfChunked(chunks, metaTitle, metaDate, metaAuthor, filename) {
    console.log(`[LLM Copier] Starting PDF generation with ${chunks.length} messages...`);
    const container = document.getElementById('pdf-hidden-container');
    
    // Move container into view for rendering (html2canvas needs visible content)
    container.style.left = '0';
    container.style.top = '0';
    container.style.zIndex = '1';
    
    // Clear and build full content
    container.innerHTML = '';

    // Create styles
    const styleTag = document.createElement('style');
    styleTag.textContent = getCommonStyles();
    container.appendChild(styleTag);

    // Create wrapper with all content
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-root';
    wrapper.style.cssText = `
        background-color: #ffffff !important;
        color: #000000 !important;
        font-family: sans-serif;
        padding: 30px;
        width: 550px; 
        box-sizing: border-box;
        position: relative;
    `;

    // Add header
    const metaBox = document.createElement('div');
    metaBox.className = 'meta-box';
    metaBox.innerHTML = `
      <h2>${metaTitle}</h2>
      <p><strong>Date:</strong> ${metaDate} | <strong>Export:</strong> ${metaAuthor}</p>
    `;
    wrapper.appendChild(metaBox);

    // Add ALL content
    const chatContent = document.createElement('div');
    chatContent.className = 'chat-content';
    
    for (const chunk of chunks) {
      const chunkDiv = document.createElement('div');
      chunkDiv.className = 'message-chunk';
      chunkDiv.innerHTML = chunk.html;
      chatContent.appendChild(chunkDiv);
    }
    
    wrapper.appendChild(chatContent);
    container.appendChild(wrapper);

    // Wait for DOM
    await new Promise(resolve => setTimeout(resolve, 300));

    // Measure content and calculate safe scale
    const totalHeight = wrapper.scrollHeight;
    const totalWidth = wrapper.scrollWidth;
    
    // Browser canvas limit is typically 16384px in one dimension
    // or ~268 megapixels total. We'll be conservative.
    const MAX_CANVAS_HEIGHT = 10000;
    let scale = 1.5;
    
    // Calculate scale to keep canvas height under limit
    const estimatedCanvasHeight = totalHeight * scale;
    if (estimatedCanvasHeight > MAX_CANVAS_HEIGHT) {
      scale = MAX_CANVAS_HEIGHT / totalHeight;
      // Don't go below 0.5 for readability
      scale = Math.max(scale, 0.5);
    }
    
    console.log(`[LLM Copier] Content size: ${totalWidth}x${totalHeight}px`);
    console.log(`[LLM Copier] Using scale: ${scale.toFixed(2)} (canvas will be ~${Math.round(totalHeight * scale)}px tall)`);

    statusEl.textContent = 'Rendering PDF...';

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: filename,
      image: { type: 'jpeg', quality: 0.92 },
      html2canvas: {
        scale: scale,
        logging: false,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        windowWidth: 600,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
      },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      // Use html2pdf's built-in pagination
      await html2pdf().set(opt).from(wrapper).save();
      
      console.log('[LLM Copier] PDF saved successfully');
      statusEl.style.color = 'green';
      statusEl.textContent = 'Download Complete!';
    } catch (err) {
      console.error('[LLM Copier] PDF generation error:', err);
      throw err;
    } finally {
      // Hide container again
      container.style.left = '-9999px';
      container.style.zIndex = '-1';
      setTimeout(() => { container.innerHTML = ''; }, 2000);
    }
  }

  // --- 5. Simple PDF generation for short conversations ---
  
  async function generatePdfSimple(chunks, metaTitle, metaDate, metaAuthor, filename) {
    console.log('[LLM Copier] Using simple PDF generation...');
    const container = document.getElementById('pdf-hidden-container');
    
    // Move into view for rendering
    container.style.left = '0';
    container.style.top = '0';
    container.style.zIndex = '1';
    
    container.innerHTML = '';
    
    // Create styles
    const styleTag = document.createElement('style');
    styleTag.textContent = getCommonStyles();
    container.appendChild(styleTag);
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-root';
    wrapper.style.cssText = `
        background-color: #ffffff !important;
        color: #000000 !important;
        font-family: sans-serif;
        padding: 30px;
        width: 550px; 
        box-sizing: border-box;
        position: relative;
    `;

    // Combine all chunks
    const allHtml = chunks.map(c => c.html).join('');
    
    wrapper.innerHTML = `
        <div class="meta-box">
          <h2>${metaTitle}</h2>
          <p><strong>Date:</strong> ${metaDate} | <strong>Export:</strong> ${metaAuthor}</p>
        </div>
        <div class="chat-content">${allHtml}</div>
    `;

    container.appendChild(wrapper);

    // Wait for render
    await new Promise(resolve => setTimeout(resolve, 200));

    // Calculate safe scale
    const totalHeight = wrapper.scrollHeight;
    const MAX_CANVAS_HEIGHT = 10000;
    let scale = 1.5;
    
    if ((totalHeight * scale) > MAX_CANVAS_HEIGHT) {
      scale = Math.max(MAX_CANVAS_HEIGHT / totalHeight, 0.5);
      console.log(`[LLM Copier] Content height ${totalHeight}px, using scale ${scale.toFixed(2)}`);
    } else {
      console.log(`[LLM Copier] Content height ${totalHeight}px, using scale ${scale}`);
    }

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: filename,
      image: { type: 'jpeg', quality: 0.92 },
      html2canvas: {
        scale: scale,
        logging: false,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        windowWidth: 600,
      },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await html2pdf().set(opt).from(wrapper).save();
      
      statusEl.style.color = 'green';
      statusEl.textContent = 'Download Complete!';
    } finally {
      // Hide container
      container.style.left = '-9999px';
      container.style.zIndex = '-1';
      setTimeout(() => { container.innerHTML = ''; }, 2000);
    }
  }

  // --- HANDLERS ---

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      console.log('[LLM Copier] Copy button clicked');
      try {
        const tab = await getActiveLLMTab();
        if (!tab) return;
        statusEl.textContent = 'Extracting Markdown...';
        
        // 1. Extract the data first
        const data = await extractData(tab.id, 'markdown');
        
        // 2. Focus the popup window explicitly before writing
        // This helps reset the "focus" state in some edge cases
        window.focus();

        try {
            console.log('[LLM Copier] Writing to clipboard...');
            await navigator.clipboard.writeText(data.markdown);
            
            console.log('[LLM Copier] Clipboard write success');
            statusEl.style.color = 'green';
            statusEl.textContent = 'Markdown Copied!';
        } catch (writeErr) {
            // If the "await" took too long and we lost permission:
            console.error('Clipboard write failed:', writeErr);
            statusEl.style.color = 'orange';
            statusEl.textContent = 'Copy failed. Try selecting a smaller chat.';
        }
      } catch (err) {
        console.error('[LLM Copier] Copy Handler Error:', err);
        statusEl.style.color = 'red';
        statusEl.textContent = 'Error: ' + err.message;
      }
    });
  }

  if (pdfBtn) {
    pdfBtn.addEventListener('click', async () => {
      console.log('[LLM Copier] PDF button clicked');
      try {
        const tab = await getActiveLLMTab();
        if (!tab) return;
        
        statusEl.textContent = 'Extracting content...';
        const data = await extractData(tab.id, 'html');

        const filename = (data.meta.title || 'chat')
          .replace(/[^a-z0-9]/gi, '_')
          .substring(0, 50) + '.pdf';
        const chunks = data.chunks || [];
        
        console.log(`[LLM Copier] Extracted ${chunks.length} message chunks`);

        if (chunks.length === 0) {
          statusEl.style.color = 'red';
          statusEl.textContent = 'No messages found to export.';
          return;
        }

        statusEl.textContent = 'Generating PDF...';

        // Build a descriptive export author string that includes the company and model
        const author_export = `${data.meta.model} (${data.meta.company}) & User`;

        // Use chunked approach for longer conversations (>10 messages)
        if (chunks.length > 10) {
          await generatePdfChunked(
            chunks,
            data.meta.title,
            data.meta.date,
            author_export,
            filename
          );
        } else {
          await generatePdfSimple(
            chunks,
            data.meta.title,
            data.meta.date,
            author_export,
            filename
          );
        }

      } catch (err) {
        console.error('[LLM Copier] PDF Handler Error:', err);
        statusEl.style.color = 'red';
        
        if (err.message && err.message.includes('Canvas exceeds')) {
          statusEl.textContent = 'Error: Content too large. Try a shorter conversation.';
        } else {
          statusEl.textContent = 'PDF Error: ' + err.message;
        }
      }
    });
  }

  if (domBtn) {
    domBtn.addEventListener('click', async () => {
      console.log('[LLM Copier] Copy DOM button clicked');
      try {
        const tab = await getActiveLLMTab();
        if (!tab) return;
        statusEl.textContent = 'Extracting page DOM...';
        
        // Execute script in the page to obtain outerHTML of the entire document
        const [{ result: domString }] = await browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.documentElement.outerHTML
        });

        // Focus the popup window explicitly before writing to clipboard
        window.focus();
        try {
          await navigator.clipboard.writeText(domString);
        statusEl.style.color = 'green';
        statusEl.textContent = 'DOM Copied!';
      } catch (err) {
          console.error('[LLM Copier] DOM Clipboard write failed:', err);
          statusEl.style.color = 'orange';
          statusEl.textContent = 'Copy failed.';
        }
      } catch (err) {
        console.error('[LLM Copier] Copy DOM Handler Error:', err);
        statusEl.style.color = 'red';
        statusEl.textContent = 'Error: ' + err.message;
      }
    });
  }
});