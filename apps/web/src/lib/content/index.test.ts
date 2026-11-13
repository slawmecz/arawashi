import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseContentJson } from './index';
import { EMPTY_CONTENT } from './schema';
import { NBSP, WORD_JOINER } from '../typography';

/** The fixture address after Polish typesetting. */
const TYPESET_ADDRESS = `ul.${NBSP}Testowa 1, 00-${WORD_JOINER}000${NBSP}Przykładowo`;

/** getSiteContent() caches per module instance, so each test imports a fresh copy. */
async function loadContent(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value as string);
  const { getSiteContent } = await import('./index');
  return getSiteContent();
}

/** Synthetic content in the JSON form the build reads from CONTENT_JSON. */
const contentJson = JSON.stringify({
  ...EMPTY_CONTENT,
  settings: { isOpp: false, venues: [], address: 'ul. Testowa 1, 00-000 Przykładowo' },
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getSiteContent', () => {
  it('returns empty content when no source is configured (never invented data)', async () => {
    const content = await loadContent({
      SANITY_PROJECT_ID: '',
      CONTENT_SOURCE: '',
      CONTENT_JSON: '',
    });
    expect(content.news).toEqual([]);
    expect(content.schedule).toEqual([]);
    expect(content.settings).toEqual({ isOpp: false, venues: [] });
  });

  it('returns the synthetic fixtures for tests', async () => {
    const content = await loadContent({ SANITY_PROJECT_ID: '', CONTENT_SOURCE: 'fixtures' });
    expect(content.groups.map((group) => group.name)).toContain('Grupa testowa A');
  });

  it('applies Polish typesetting to the displayed text', async () => {
    const content = await loadContent({ SANITY_PROJECT_ID: '', CONTENT_SOURCE: 'fixtures' });
    expect(content.settings.address).toBe(TYPESET_ADDRESS);
  });

  it('reads the club content from CONTENT_JSON, typeset like the other sources', async () => {
    const content = await loadContent({
      SANITY_PROJECT_ID: '',
      CONTENT_SOURCE: '',
      CONTENT_JSON: contentJson,
    });
    expect(content.settings.address).toBe(TYPESET_ADDRESS);
  });

  it('keeps the fixtures for tests even when CONTENT_JSON is set', async () => {
    const content = await loadContent({
      SANITY_PROJECT_ID: '',
      CONTENT_SOURCE: 'fixtures',
      CONTENT_JSON: contentJson,
    });
    expect(content.groups.map((group) => group.name)).toContain('Grupa testowa A');
  });

  it('resolves the content only once per build', async () => {
    vi.resetModules();
    vi.stubEnv('CONTENT_SOURCE', 'fixtures');
    const { getSiteContent } = await import('./index');
    expect(getSiteContent()).toBe(getSiteContent());
  });
});

describe('parseContentJson', () => {
  it('fails on invalid JSON without quoting the input in the error', () => {
    const secret = '{"settings": PRYWATNE-DANE';
    expect(() => parseContentJson(secret)).toThrow(/not valid JSON/);
    expect(() => parseContentJson(secret)).not.toThrow(/PRYWATNE/);
  });

  it('fails on content that does not match the schema', () => {
    expect(() => parseContentJson('{"settings": {}}')).toThrow();
    expect(() => parseContentJson(JSON.stringify({ ...EMPTY_CONTENT, groups: [{}] }))).toThrow();
  });

  it('accepts valid content', () => {
    expect(parseContentJson(contentJson).settings.isOpp).toBe(false);
  });
});
