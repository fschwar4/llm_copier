// Default settings for PDF export
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
  /**
   * Stroke thickness of table lines in points. Smaller values produce thinner
   * lines. Defaults to 0.5 for a light line weight.
   */
  tableLineWidth: 0.5,
  /**
   * Color of the horizontal dividing line between the table header and body.
   * Defaults to black for a clear separation.
   */
  tableHeaderLineColor: '#000000',
  /**
   * Color of all remaining table lines (horizontal and vertical).
   * Defaults to a light grey for subtle borders.
   */
  tableLineColor: '#cccccc'
  ,
  /**
   * Background fill color for the header row of tables. This allows the user
   * to customize the subtle shading used on the first row of each table.
   */
  tableHeaderFillColor: '#f5f5f5'
};

// Map of setting IDs to their types
const SETTING_TYPES = {
  'page-size': 'select',
  'page-margins': 'number',
  'font-title': 'number',
  'font-h1': 'number',
  'font-h2': 'number',
  'font-h3': 'number',
  'font-body': 'number',
  'font-code': 'number',
  'color-title': 'color',
  'color-h1': 'color',
  'color-h2': 'color',
  'color-body': 'color',
  'color-link': 'color',
  'code-bg': 'color',
  'syntax-highlight': 'checkbox',
  'toc-enabled': 'checkbox',
  // Table styling controls
  'table-line-width': 'number',
  'table-header-line-color': 'color',
  'table-line-color': 'color'
  ,
  // Background color for the table header row
  'table-header-fill-color': 'color'
};

// Map element IDs to setting keys
const ID_TO_KEY = {
  'page-size': 'pageSize',
  'page-margins': 'pageMargins',
  'font-title': 'fontTitle',
  'font-h1': 'fontH1',
  'font-h2': 'fontH2',
  'font-h3': 'fontH3',
  'font-body': 'fontBody',
  'font-code': 'fontCode',
  'color-title': 'colorTitle',
  'color-h1': 'colorH1',
  'color-h2': 'colorH2',
  'color-body': 'colorBody',
  'color-link': 'colorLink',
  'code-bg': 'codeBg',
  'syntax-highlight': 'syntaxHighlight',
  'toc-enabled': 'tocEnabled',
  // Table styling controls
  'table-line-width': 'tableLineWidth',
  'table-header-line-color': 'tableHeaderLineColor',
  'table-line-color': 'tableLineColor'
  ,
  'table-header-fill-color': 'tableHeaderFillColor'
};

/**
 * Load settings from storage and populate form
 */
async function loadSettings() {
  try {
    const result = await browser.storage.local.get('pdfSettings');
    const settings = result.pdfSettings || DEFAULT_SETTINGS;

    // Populate form fields
    for (const [elementId, settingKey] of Object.entries(ID_TO_KEY)) {
      const element = document.getElementById(elementId);
      if (!element) continue;

      const value = settings[settingKey] ?? DEFAULT_SETTINGS[settingKey];
      const type = SETTING_TYPES[elementId];

      if (type === 'checkbox') {
        element.checked = value;
      } else {
        element.value = value;
      }
    }

    console.log('[Settings] Loaded settings:', settings);
  } catch (err) {
    console.error('[Settings] Failed to load settings:', err);
    showStatus('Failed to load settings', 'red');
  }
}

/**
 * Save current form values to storage
 */
async function saveSettings() {
  try {
    const settings = {};

    // Collect values from form
    for (const [elementId, settingKey] of Object.entries(ID_TO_KEY)) {
      const element = document.getElementById(elementId);
      if (!element) continue;

      const type = SETTING_TYPES[elementId];

      if (type === 'checkbox') {
        settings[settingKey] = element.checked;
      } else if (type === 'number') {
        // Parse as float to allow fractional line widths
        settings[settingKey] = parseFloat(element.value);
      } else {
        settings[settingKey] = element.value;
      }
    }

    await browser.storage.local.set({ pdfSettings: settings });
    console.log('[Settings] Saved settings:', settings);
    showStatus('Settings saved successfully!', 'green');
  } catch (err) {
    console.error('[Settings] Failed to save settings:', err);
    showStatus('Failed to save settings', 'red');
  }
}

/**
 * Reset all settings to defaults
 */
async function resetSettings() {
  try {
    await browser.storage.local.set({ pdfSettings: DEFAULT_SETTINGS });
    await loadSettings();
    showStatus('Settings reset to defaults', 'green');
  } catch (err) {
    console.error('[Settings] Failed to reset settings:', err);
    showStatus('Failed to reset settings', 'red');
  }
}

/**
 * Show status message
 */
function showStatus(message, color) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.style.color = color;

  // Clear after 3 seconds
  setTimeout(() => {
    statusEl.textContent = '';
  }, 3000);
}

/**
 * Go back to popup
 */
function goBack() {
  window.close();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  document.getElementById('save-btn').addEventListener('click', saveSettings);
  document.getElementById('reset-btn').addEventListener('click', resetSettings);
  document.getElementById('back-btn').addEventListener('click', goBack);
});