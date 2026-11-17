import { 
  toTitleCase
} from './utils.js';

import {
  getModelNameChatGPT,
  getModelNameChatGPTFromApi,
  getUserNameChatGPT,
  parseChatGPT,
  parseChatGPTFromApi,
  getModelNameClaude,
  getUserNameClaude,
  parseClaude,
  restoreClaudeTranscript,
  getModelNameGemini,
  getUserNameGemini,
  getChatTitleGemini,
  parseGemini
} from './extractors.js';

import {
  markdownToPdf
} from './markdown2pdf.js';


/**
 * Fetch the active ChatGPT conversation via the backend API.
 * Runs inside the page context so cookies/CSRF are valid. Returns
 * { ok: true, conversation } on success, or { error: '...' } on failure.
 */
async function fetchChatGPTConversationViaApi(tabId) {
  try {
    const [{ result }] = await browser.scripting.executeScript({
      target: { tabId },
      func: async () => {
        const match = location.pathname.match(/\/c\/([a-zA-Z0-9-]+)$/);
        if (!match) return { error: 'no_conversation_id' };
        const conversationId = match[1];

        let accessToken;
        try {
          const sessionRes = await fetch('/api/auth/session', { credentials: 'same-origin' });
          if (!sessionRes.ok) return { error: 'session_status_' + sessionRes.status };
          const session = await sessionRes.json();
          accessToken = session?.accessToken;
        } catch (e) {
          return { error: 'session_fetch_failed', message: String(e) };
        }
        if (!accessToken) return { error: 'no_access_token' };

        try {
          const convRes = await fetch('/backend-api/conversation/' + conversationId, {
            credentials: 'same-origin',
            headers: {
              'Authorization': 'Bearer ' + accessToken,
              'Accept': 'application/json'
            }
          });
          if (!convRes.ok) return { error: 'conversation_status_' + convRes.status };
          const conversation = await convRes.json();
          return { ok: true, conversation };
        } catch (e) {
          return { error: 'conversation_fetch_failed', message: String(e) };
        }
      }
    });
    return result;
  } catch (e) {
    return { error: 'inject_failed', message: String(e) };
  }
}


/**
 * claude.ai only renders the transcript rows near the viewport; the others
 * are empty spacers until the user scrolls to them. If rows are missing,
 * scroll to each spacer inside the page, collect the HTML of every row as it
 * renders, then scroll back to where the user was.
 *
 * Returns null (nothing to do: old layout or all rows rendered), or
 * { rows: [outerHTML in index order], total, missing: [indices not loaded] }.
 * total is 0 when the row count cannot be read from the page.
 */
async function loadClaudeTranscriptRows(tabId) {
  try {
    const [{ result }] = await browser.scripting.executeScript({
      target: { tabId },
      func: async () => {
        const ROW = '[data-testid="transcript-row"][data-index]';
        const getRows = () => Array.from(document.querySelectorAll(ROW));
        const initial = getRows();
        if (!initial.length) return null;

        // Every row carries its distance to the last row, so
        // index + from-tail + 1 is the number of rows in the chat.
        let total = 0;
        for (const r of initial) {
          const i = Number(r.dataset.index);
          const fromTail = Number(r.dataset.perfRowFromTail);
          if (r.dataset.perfRowFromTail && Number.isInteger(i) && Number.isInteger(fromTail)) {
            total = Math.max(total, i + fromTail + 1);
          }
          if (r.dataset.lastMessage === 'true' && Number.isInteger(i)) total = Math.max(total, i + 1);
        }

        const seen = new Map(); // index → { html, len }
        const collect = () => {
          for (const r of getRows()) {
            const i = Number(r.dataset.index);
            if (!Number.isInteger(i)) continue;
            const len = r.textContent.length;
            const prev = seen.get(i);
            if (!prev || len >= prev.len) seen.set(i, { html: r.outerHTML, len });
          }
        };
        const missing = () => {
          const m = [];
          for (let i = 0; i < total; i++) if (!seen.has(i)) m.push(i);
          return m;
        };
        const complete = () => total > 0 && missing().length === 0;

        const SPACER = '[data-testid="transcript-spacer"]';
        const tall = (el) => el.getBoundingClientRect().height > 2;

        collect();
        if (total > 0 ? complete() : !Array.from(document.querySelectorAll(SPACER)).some(tall)) {
          return null;
        }

        let scroller = initial[0].closest('[data-autoscroll-container]');
        for (let e = initial[0].parentElement; !scroller && e && e !== document.body; e = e.parentElement) {
          const oy = getComputedStyle(e).overflowY;
          if ((oy === 'auto' || oy === 'scroll') && e.scrollHeight > e.clientHeight) scroller = e;
        }
        scroller = scroller || document.scrollingElement;
        const view = () => {
          if (scroller === document.scrollingElement) return { top: 0, bottom: window.innerHeight };
          const r = scroller.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom };
        };

        // After a scroll, wait until no spacer is visible any more (the rows
        // there have rendered) and the rendered rows stop changing.
        const spacerInView = () => {
          const v = view();
          return Array.from(document.querySelectorAll(SPACER)).some(s => {
            const r = s.getBoundingClientRect();
            return Math.min(r.bottom, v.bottom) - Math.max(r.top, v.top) > 2;
          });
        };
        const settle = async () => {
          let last = null;
          const deadline = Date.now() + 2000;
          while (Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 50));
            const sig = getRows().map(r => r.dataset.index + ':' + r.textContent.length).join(',');
            if (sig === last && !spacerInView()) return;
            last = sig;
          }
        };
        const scrollTo = async (top) => {
          scroller.scrollTop = top;
          // Browsers deliver scroll events with the next frame, which can be
          // late or never come in a throttled tab; notify the list directly.
          (scroller === document.scrollingElement ? document : scroller)
            .dispatchEvent(new Event('scroll'));
          await settle();
        };
        const scrollBy = async (delta) => {
          await scrollTo(scroller.scrollTop + delta);
          collect();
        };

        // First spacer that stands in for rows not collected yet.
        const nextGap = () => {
          for (const s of document.querySelectorAll(SPACER)) {
            if (!tall(s)) continue;
            let prev = s.previousElementSibling;
            while (prev && !prev.matches(ROW)) prev = prev.previousElementSibling;
            let next = s.nextElementSibling;
            while (next && !next.matches(ROW)) next = next.nextElementSibling;
            const from = prev ? Number(prev.dataset.index) + 1 : 0;
            const to = next ? Number(next.dataset.index) : (total || from + 1);
            for (let i = from; i < to; i++) if (!seen.has(i)) return s;
          }
          return null;
        };

        // Remember where the user is, to scroll back there afterwards.
        const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
        const startTop = scroller.scrollTop;
        const anchor = getRows().find(r => r.getBoundingClientRect().bottom > view().top);
        const anchorIndex = anchor?.dataset.index;
        const anchorOffset = anchor ? anchor.getBoundingClientRect().top - view().top : 0;

        try {
          // Jump to each gap: scroll its spacer to the top of the view.
          let stuck = 0;
          for (let step = 0; step < 5000 && stuck < 3 && !complete(); step++) {
            const gap = nextGap();
            if (!gap) break;
            const before = seen.size;
            await scrollBy(gap.getBoundingClientRect().top - view().top);
            stuck = seen.size > before ? 0 : stuck + 1;
          }
          // Fallback: page through the whole chat from the top.
          if (total > 0 && !complete()) {
            await scrollBy(-scroller.scrollTop);
            for (let step = 0; step < 5000 && !complete(); step++) {
              const before = scroller.scrollTop;
              if (before + scroller.clientHeight >= scroller.scrollHeight - 2) break;
              await scrollBy(Math.max(200, scroller.clientHeight * 0.8));
              if (scroller.scrollTop === before) break;
            }
          }
        } finally {
          if (atBottom) {
            await scrollTo(scroller.scrollHeight);
          } else {
            // Row heights may have changed once rendered: go back to the
            // previous position, find the row that was at the top, line it up.
            await scrollTo(startTop);
            for (let step = 0; anchorIndex !== undefined && step < 100; step++) {
              const a = document.querySelector(`${ROW}[data-index="${anchorIndex}"]`);
              if (a) {
                await scrollTo(scroller.scrollTop + a.getBoundingClientRect().top - view().top - anchorOffset);
                break;
              }
              const v = view();
              const shown = getRows()
                .filter(r => { const b = r.getBoundingClientRect(); return b.bottom > v.top && b.top < v.bottom; })
                .map(r => Number(r.dataset.index));
              if (!shown.length) break;
              const up = Math.min(...shown) > Number(anchorIndex);
              const before = scroller.scrollTop;
              await scrollTo(before + (up ? -0.8 : 0.8) * scroller.clientHeight);
              if (scroller.scrollTop === before) break;
            }
          }
        }

        return {
          rows: Array.from(seen.entries()).sort((a, b) => a[0] - b[0]).map(([, v]) => v.html),
          total,
          missing: missing()
        };
      }
    });
    return result;
  } catch (e) {
    console.warn('[LLM Copier] Could not load all Claude messages:', e);
    return null;
  }
}


// Helper: Extract data based on type
// name is extracted from button dataset (data-name)
async function extractDataByType(tabId, name) {
  switch(name) {

    case 'Markdown':
      const data = await extractMDData(tabId);
      return data;
    
    case 'HTML':
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
    // 0. Determine URL first so we can apply platform-specific pre-rendering.
    const [{ result: urlResult }] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => window.location.href
    });
    const pageUrl = urlResult || '';

    // ChatGPT virtualizes off-screen conversation turns, so the DOM never
    // contains the full chat for long threads. Fetch the conversation JSON
    // directly from ChatGPT's backend API — this is what mature exporters
    // (e.g. pionxzh/chatgpt-exporter) do, and it sidesteps the DOM entirely.
    // Falls back to scroll-based DOM rendering if the API call fails.
    let chatgptApiConversation = null;
    if (pageUrl.includes('chatgpt.com')) {
      const apiRes = await fetchChatGPTConversationViaApi(tabId);
      if (apiRes?.ok && apiRes.conversation?.mapping) {
        chatgptApiConversation = apiRes.conversation;
        console.log('[LLM Copier] ChatGPT backend API succeeded');
      } else {
        console.warn(
          '[LLM Copier] ChatGPT API unavailable (' + (apiRes?.error || 'unknown') +
          '); falling back to DOM extraction with scroll-based pre-render'
        );
        await browser.scripting.executeScript({
          target: { tabId },
          func: async () => {
            const sel = '[data-testid^="conversation-turn-"]';
            const isRendered = (t) => !!t.querySelector('[data-message-author-role]');
            for (const turn of document.querySelectorAll(sel)) {
              if (isRendered(turn)) continue;
              turn.scrollIntoView({ block: 'center', behavior: 'instant' });
              const deadline = Date.now() + 1500;
              while (Date.now() < deadline) {
                await new Promise((r) => setTimeout(r, 80));
                if (isRendered(turn)) break;
              }
            }
          }
        });
      }
    }

    // claude.ai virtualizes the chat: messages away from the viewport are not
    // in the DOM. Collect them by scrolling through the chat.
    let claudeRows = null;
    if (pageUrl.includes('claude.ai')) {
      claudeRows = await loadClaudeTranscriptRows(tabId);
    }

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
    if (claudeRows && restoreClaudeTranscript(doc, claudeRows.rows)) {
      console.log(`[LLM Copier] Claude: collected ${claudeRows.rows.length} of ${claudeRows.total || '?'} chat rows`);
    }

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
      if (chatgptApiConversation) {
        modelName = getModelNameChatGPTFromApi(chatgptApiConversation);
        if (chatgptApiConversation.title) pageTitle = chatgptApiConversation.title;
      } else {
        modelName = getModelNameChatGPT(doc);
      }
      userName = toTitleCase(getUserNameChatGPT(doc));

    } else if (url.includes('claude.ai')) {
      company = 'Anthropic';
      // document.title is "<chat name> - Claude"
      pageTitle = pageTitle.replace(/\s+[-–]\s+Claude$/, '') || pageTitle;
      modelName = getModelNameClaude(doc);
      userName = toTitleCase(getUserNameClaude(doc));

    } else if (url.includes('gemini.google.com')) {
      company = 'Google';
      modelName = getModelNameGemini(doc);
      userName = toTitleCase(getUserNameGemini(doc));
      
      // document.title is "<chat name> - Google Gemini" once Gemini has named
      // the chat, otherwise generic; then use the first question.
      const named = pageTitle.match(/^(.+?)\s+[-–]\s+(?:Google\s+)?Gemini$/);
      if (named) {
        pageTitle = named[1];
      } else {
        const geminiChatTitle = getChatTitleGemini(doc);
        if (geminiChatTitle) {
          pageTitle = geminiChatTitle;
        }
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
      md_content += chatgptApiConversation
        ? parseChatGPTFromApi(chatgptApiConversation, modelName)
        : parseChatGPT(doc, modelName);
    }
    else if (company.includes('Anthropic')) {
      if (claudeRows?.missing?.length) {
        md_content += `**Note:** ${claudeRows.missing.length} of ${claudeRows.total} chat messages could not be loaded and are missing from this export. Scroll through the whole chat once and export again.\n\n`;
      }
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
