import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

const manifest = JSON.parse(readFileSync(join(SRC, 'manifest.json'), 'utf-8'));

// ---------------------------------------------------------------------------
// Firefox ESR compatibility constants
//
// Manifest V3 requires Firefox >= 109. The current ESR branch is 140.x.
// We set the ceiling to the oldest *active* ESR so the CI test fails whenever
// strict_min_version drifts above it again.
// Update CURRENT_ESR_VERSION when Mozilla ships a new ESR branch.
// ---------------------------------------------------------------------------
const MV3_MIN_FIREFOX = 109;
const CURRENT_ESR_VERSION = 140;

describe('manifest.json – structure', () => {
  it('is valid JSON with required top-level fields', () => {
    assert.ok(manifest.manifest_version, 'manifest_version is required');
    assert.ok(manifest.name, 'name is required');
    assert.ok(manifest.version, 'version is required');
    assert.ok(manifest.description, 'description is required');
  });

  it('uses Manifest V3', () => {
    assert.equal(manifest.manifest_version, 3);
  });

  it('has a valid semver-like version string', () => {
    assert.match(manifest.version, /^\d+\.\d+\.\d+$/,
      `version "${manifest.version}" should be X.Y.Z`);
  });

  it('declares an action with a default_popup', () => {
    assert.ok(manifest.action, 'action key is required');
    assert.ok(manifest.action.default_popup, 'default_popup is required');
  });

  it('declares required permissions', () => {
    const required = ['clipboardWrite', 'scripting', 'downloads', 'activeTab', 'storage'];
    for (const perm of required) {
      assert.ok(manifest.permissions.includes(perm),
        `missing required permission: ${perm}`);
    }
  });

  it('declares host_permissions for supported LLM platforms', () => {
    const hosts = manifest.host_permissions || [];
    assert.ok(hosts.some(h => h.includes('chatgpt.com')), 'missing ChatGPT host');
    assert.ok(hosts.some(h => h.includes('claude.ai')), 'missing Claude host');
    assert.ok(hosts.some(h => h.includes('gemini.google.com')), 'missing Gemini host');
  });
});

describe('manifest.json – Firefox / Gecko settings', () => {
  const gecko = manifest.browser_specific_settings?.gecko;

  it('has browser_specific_settings.gecko section', () => {
    assert.ok(gecko, 'gecko settings are required for Firefox extensions');
  });

  it('has a non-empty extension id', () => {
    assert.ok(gecko.id, 'gecko.id is required');
    assert.match(gecko.id, /@/, 'gecko.id should contain @');
  });

  it('declares a strict_min_version', () => {
    assert.ok(gecko.strict_min_version,
      'strict_min_version is required for predictable compatibility');
  });

  it('strict_min_version is a valid version string', () => {
    assert.match(gecko.strict_min_version, /^\d+(\.\d+)*$/,
      `"${gecko.strict_min_version}" is not a valid version string`);
  });

  it(`strict_min_version >= ${MV3_MIN_FIREFOX} (Manifest V3 baseline)`, () => {
    const minVer = parseInt(gecko.strict_min_version, 10);
    assert.ok(minVer >= MV3_MIN_FIREFOX,
      `strict_min_version ${gecko.strict_min_version} is below MV3 baseline ${MV3_MIN_FIREFOX}`);
  });

  it(`strict_min_version <= ${CURRENT_ESR_VERSION} (current Firefox ESR)`, () => {
    const minVer = parseInt(gecko.strict_min_version, 10);
    assert.ok(minVer <= CURRENT_ESR_VERSION,
      `strict_min_version ${gecko.strict_min_version} exceeds Firefox ESR ${CURRENT_ESR_VERSION} – ` +
      'ESR users will not be able to install the extension (see GitHub issue #1)');
  });
});

describe('manifest.json – icons', () => {
  it('declares at least one icon', () => {
    assert.ok(manifest.icons, 'icons field is required');
    assert.ok(Object.keys(manifest.icons).length > 0, 'at least one icon size required');
  });

  it('icon sizes are numeric strings', () => {
    for (const size of Object.keys(manifest.icons)) {
      assert.ok(/^\d+$/.test(size), `icon size "${size}" should be numeric`);
    }
  });
});
