import { describe, expect, it } from 'vitest';
import { NBSP } from '../typography';
import { FIXTURE_CONTENT } from './fixtures';
import type { SiteContent } from './schema';
import { typesetContent } from './typeset';

const content: SiteContent = {
  ...FIXTURE_CONTENT,
  groups: [{ id: 'g', name: 'Dzieci i młodzież', description: 'Zajęcia w sali' }],
  schedule: [
    {
      id: 's',
      groupName: 'Dzieci i młodzież',
      day: 2,
      start: '17:00',
      end: '18:00',
      venue: 'Sala nr 2',
    },
  ],
  news: [
    {
      id: 'n',
      slug: 'turniej-w-siechnicach',
      title: 'Medale w turnieju',
      date: '2026-10-15',
      excerpt: 'Trzy medale i puchar',
      bodyHtml: '<p>Byliśmy w <a href="https://example.com/a b">hali</a>.</p>',
    },
  ],
};

describe('typesetContent', () => {
  const result = typesetContent(content);

  it('joins short words in displayed text and rich text', () => {
    expect(result.news[0]?.title).toBe(`Medale w${NBSP}turnieju`);
    expect(result.news[0]?.excerpt).toBe(`Trzy medale i${NBSP}puchar`);
    expect(result.news[0]?.bodyHtml).toBe(
      `<p>Byliśmy w${NBSP}<a href="https://example.com/a b">hali</a>.</p>`,
    );
    expect(result.groups[0]?.description).toBe(`Zajęcia w${NBSP}sali`);
    expect(result.schedule[0]?.venue).toBe(`Sala nr${NBSP}2`);
  });

  it('never changes identifiers or values compared in code', () => {
    expect(result.news[0]?.slug).toBe('turniej-w-siechnicach');
    // Group names are filter keys and form values, so they stay exactly as entered.
    expect(result.groups[0]?.name).toBe('Dzieci i młodzież');
    expect(result.schedule[0]?.groupName).toBe('Dzieci i młodzież');
    expect(result.documents.map((doc) => doc.url)).toEqual(content.documents.map((doc) => doc.url));
  });

  it('does not mutate its input', () => {
    expect(content.news[0]?.title).toBe('Medale w turnieju');
  });
});
