import { 
  toTitleCase
} from './utils.js';

import {
  getModelNameChatGPT,
  getUserNameChatGPT,
  parseChatGPT,
  getModelNameClaude,
  getUserNameClaude,
  parseClaude,
  getModelNameGemini,
  getUserNameGemini,
  getChatTitleGemini,
  parseGemini
} from './extractors.js';

import {
  markdownToPdf
} from './markdown2pdf.js';


// Helper: Extract data based on type
// name is extracted from button dataset (data-name)
async function extractDataByType(tabId, name) {
  switch(name) {

    case 'Markdown':
      const data = await extractMDData(tabId);
      return data;
    
    case 'DOM':
      const [{ result }] = await browser.scripting.executeScript({
        target: { tabId },
        func: () => document.documentElement.outerHTML
      });
      return result;

    case 'PDF':
      // For PDF, we return the markdown and handle it differently
      const pdfData = await extractMDData(tabId);
      return pdfData;

    default:
      throw new Error(`Unknown copy type: ${name}`);
  }
}

// --- Main Extraction Logic ---
async function extractMDData(tabId) {
  console.log('[LLM Copier] Extracting HTML to parse in Popup...');
  
  try {
    // 1. Get the raw data from the tab (HTML, URL, Title)
    // We only inject logic to retrieve data, not to process it.
    const [{ result }] = await browser.scripting.executeScript({
      target: { tabId: tabId },
      func: () => ({
        html: document.documentElement.outerHTML,
        url: window.location.href,
        title: document.title
      })
    });

    if (!result) {
      throw new Error("Failed to retrieve page content.");
    }

    const { html, url, title } = result;

    // 2. Reconstruct the DOM inside the Popup context
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 3. Run the extraction logic LOCALLY (where imports are available)
    console.log('[LLM Copier] Processing content locally...');
    
    const today = new Date().toISOString().split('T')[0];
    let pageTitle = title || 'Chat Export';
    
    let company = 'Unknown AI'; 
    let modelName = 'LLM';
    let userName = 'User';
    
    // Improved Model Detection based on Domain
    if (url.includes('chatgpt.com')) {
      company = 'OpenAI';
      modelName = getModelNameChatGPT(doc); // Pass the parsed doc
      userName = toTitleCase(getUserNameChatGPT(doc));

    } else if (url.includes('claude.ai')) {
      company = 'Anthropic';
      modelName = getModelNameClaude(doc);
      userName = toTitleCase(getUserNameClaude(doc));

    } else if (url.includes('gemini.google.com')) {
      company = 'Google';
      modelName = getModelNameGemini(doc);
      userName = toTitleCase(getUserNameGemini(doc));
      
      // Extract actual chat title for Gemini (document.title is generic)
      const geminiChatTitle = getChatTitleGemini(doc);
      if (geminiChatTitle) {
        pageTitle = geminiChatTitle;
      }
    } else {
      console.warn('[LLM Copier] Unknown LLM platform for URL:', url);
    }

    // Compute safeTitle after company detection (Gemini may have updated pageTitle)
    const safeTitle = pageTitle.replace(/"/g, '\\"');

    console.log(`[LLM Copier] Detected Company: ${company}, Model: ${modelName}, User: ${userName}`);
    
    // Create the Quarto YAML Header
    let md_content = `---
title: "${safeTitle}"
date: "${today}"
author: "${modelName} & ${userName}"
format:
  pdf:
    toc: true
    toc-depth: 1
    number-sections: true
    code-fold: show
    mainfont: "Avenir"
execute:
  enabled: false
---

`;
    md_content += '\n\\newpage\n\n';
    
    // Extract Content Based on Company
    if (company.includes('OpenAI')) {
      md_content += parseChatGPT(doc, modelName);
    }
    else if (company.includes('Anthropic')) {
      md_content += parseClaude(doc, modelName);
    }
    else if (company.includes('Google')) {
      md_content += parseGemini(doc, modelName);
    } else {
      md_content += '\n\n**Error:** Unsupported LLM platform for content extraction.\n\n';
    }

    return md_content;

  } catch (err) {
    console.error('[LLM Copier] Extraction Failed:', err);
    throw err;
  }
}

// --- Main Popup Logic ---
document.addEventListener('DOMContentLoaded', () => {
  // --- Function to get active LLM tab ---
  // --- Returns a tabs.Tab object (or null) from the Browser Extensions API ---
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
  
  console.log('[LLM Copier] Popup DOMContentLoaded');
  const statusEl = document.getElementById('status');

  // Auto-attach handler to all copy buttons
  document.querySelectorAll('.copy-btn').forEach(button => {
    button.addEventListener('click', async (event) => {
      const { name } = event.currentTarget.dataset;
      console.log(`[LLM Copier] Copy ${name} button clicked`);
      try {
        const tab = await getActiveLLMTab();
        if (!tab) return;
        
        statusEl.textContent = `Extracting ${name}...`;
        statusEl.style.color = 'blue';
        
        const data = await extractDataByType(tab.id, name);
        
        // Write the extracted data to clipboard
        // focus popup window explicitly helps in some edge cases
        window.focus();
        try {
          await navigator.clipboard.writeText(data);
          console.log('[LLM Copier] Clipboard write success');
          statusEl.style.color = 'green';
          statusEl.textContent = `${name} Copied! ✓`;
        } catch (writeErr) {  // Clipboard write failed
          console.error('Clipboard write failed:', writeErr);
          statusEl.style.color = 'orange';
          statusEl.textContent = 'Copy failed. Try again.';
        }

      } catch (err) {  // Extraction or other error
        console.error(`Copy ${name} Handler Error:`, err);
        statusEl.style.color = 'red';
        statusEl.textContent = 'Error: ' + err.message;
      }
    });
  });

  // Handle PDF button
  document.querySelectorAll('.save-btn').forEach(button => {
    button.addEventListener('click', async (event) => {
      const { name } = event.currentTarget.dataset;
      console.log(`[LLM Copier] Save ${name} button clicked`);
      
      try {
        const tab = await getActiveLLMTab();
        if (!tab) return;
        
        statusEl.textContent = `Generating ${name}...`;
        statusEl.style.color = 'blue';
        
        // Extract markdown
        const markdown = await extractDataByType(tab.id, name);
        
        // Generate filename from title
        const titleMatch = markdown.match(/^---\ntitle: "(.+)"/m);
        const title = titleMatch ? titleMatch[1] : 'chat-export';
        const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const filename = `${sanitizedTitle}-${Date.now()}.pdf`;
        
        // Convert to PDF and download
        await markdownToPdf(markdown, filename);
        
        statusEl.style.color = 'green';
        statusEl.textContent = `${name} Generated! ✓`;
        
      } catch (err) {
        console.error(`Save ${name} Handler Error:`, err);
        statusEl.style.color = 'red';
        statusEl.textContent = 'Error: ' + err.message;
      }
    });
  });

});
