import { afterEach, describe, expect, it, vi } from 'vitest';

/** getSiteContent() caches per module instance, so each test imports a fresh copy. */
async function loadContent(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value as string);
  const { getSiteContent } = await import('./index');
  return getSiteContent();
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getSiteContent', () => {
  it('returns empty content when no source is configured (never invented data)', async () => {
    const content = await loadContent({ SANITY_PROJECT_ID: '', CONTENT_SOURCE: '' });
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
    expect(content.settings.address).toBe('ul.\u00a0Testowa 1, 00-000\u00a0Przykładowo');
  });

  it('resolves the content only once per build', async () => {
    vi.resetModules();
    vi.stubEnv('CONTENT_SOURCE', 'fixtures');
    const { getSiteContent } = await import('./index');
    expect(getSiteContent()).toBe(getSiteContent());
  });
});
