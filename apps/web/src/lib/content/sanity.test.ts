import { describe, expect, it, vi } from 'vitest';
import { FIXTURE_CONTENT } from './fixtures';
import { mapSanityContent, portableTextToHtml } from './sanity';
import { siteContentSchema } from './schema';

const block = (text: string, markDefs: unknown[] = [], marks: string[] = []) => ({
  _type: 'block',
  _key: 'b1',
  style: 'normal',
  markDefs,
  children: [{ _type: 'span', _key: 's1', text, marks }],
});

describe('portableTextToHtml', () => {
  it('renders paragraphs and escapes text', () => {
    expect(portableTextToHtml([block('Ala <b>ma</b> kota')])).toBe(
      '<p>Ala &lt;b&gt;ma&lt;/b&gt; kota</p>',
    );
  });

  it('keeps safe links and drops javascript: links', () => {
    const safe = block(
      'strona',
      [{ _key: 'l1', _type: 'link', href: 'https://example.com' }],
      ['l1'],
    );
    expect(portableTextToHtml([safe])).toContain(
      '<a href="https://example.com" rel="noopener noreferrer">',
    );

    const unsafe = block(
      'klik',
      [{ _key: 'l1', _type: 'link', href: 'javascript:alert(1)' }],
      ['l1'],
    );
    expect(portableTextToHtml([unsafe])).toBe('<p>klik</p>');
  });

  it('returns an empty string for missing content', () => {
    expect(portableTextToHtml(null)).toBe('');
  });
});

describe('mapSanityContent', () => {
  const image = {
    alt: 'Opis zdjęcia',
    src: 'https://cdn.sanity.io/images/p/d/a.jpg',
    width: 800,
    height: 600,
  };

  it('maps a full GROQ result to the site content shape', () => {
    const content = mapSanityContent({
      settings: {
        phone: '+48 000 000 000',
        isOpp: true,
        venues: [{ name: 'Sala', address: 'ul. A 1' }],
        krs: null,
      },
      about: [block('O klubie')],
      groups: [{ id: 'g1', name: 'Grupa A', ageRange: null, description: null }],
      schedule: [
        { id: 's1', groupName: 'Grupa A', day: '2', start: '17:00', end: '18:00', venue: null },
      ],
      news: [
        {
          id: 'n1',
          slug: 'pierwszy',
          title: 'Pierwszy',
          date: '2026-10-01',
          excerpt: null,
          body: [block('Treść')],
          image,
        },
      ],
      camps: [],
      achievements: [],
      coaches: [
        { id: 'c1', name: 'Trener', role: null, rank: null, bio: [block('Bio')], photo: null },
      ],
      documents: [
        {
          id: 'd1',
          title: 'Regulamin',
          description: null,
          category: 'regulamin',
          url: 'https://cdn.sanity.io/files/p/d/r.pdf',
        },
      ],
      faq: [{ id: 'f1', question: 'Pytanie?', answer: [block('Odpowiedź')] }],
    });

    expect(siteContentSchema.safeParse(content).success).toBe(true);
    expect(content.settings.isOpp).toBe(true);
    expect(content.aboutHtml).toBe('<p>O klubie</p>');
    expect(content.schedule[0]?.day).toBe(2);
    expect(content.news[0]?.bodyHtml).toBe('<p>Treść</p>');
    expect(content.news[0]?.image).toEqual(image);
    expect(content.coaches[0]?.photo).toBeUndefined();
  });

  it('skips invalid documents without printing their content', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const content = mapSanityContent({
      news: [{ id: 'bad', slug: 'Zły Slug!', title: 'Tajny tytuł', date: '2026-10-01', body: [] }],
    });
    expect(content.news).toEqual([]);
    expect(warn).toHaveBeenCalledWith('[content] skipped invalid newsPost document bad');
    expect(String(warn.mock.calls[0])).not.toContain('Tajny');
    warn.mockRestore();
  });

  it('falls back to safe defaults when nothing is published yet', () => {
    const content = mapSanityContent({});
    expect(content.settings).toEqual({ isOpp: false, venues: [] });
    expect(content.news).toEqual([]);
  });
});

describe('FIXTURE_CONTENT', () => {
  it('matches the content schema', () => {
    expect(siteContentSchema.safeParse(FIXTURE_CONTENT).success).toBe(true);
  });
});

describe('mapSanityContent safety', () => {
  it('drops javascript: links but keeps the rest of the contact data', () => {
    const content = mapSanityContent({
      settings: {
        phone: '+48 000 000 000',
        facebookUrl: 'javascript:alert(1)',
        instagramUrl: 'https://www.instagram.com/example',
        venues: [{ name: 'Sala', address: 'ul. A 1', mapUrl: 'data:text/html,x' }],
      },
    });
    expect(content.settings.phone).toBe('+48 000 000 000');
    expect(content.settings.facebookUrl).toBeUndefined();
    expect(content.settings.instagramUrl).toBe('https://www.instagram.com/example');
    expect(content.settings.venues[0]?.mapUrl).toBeUndefined();
  });

  it('drops an image without alt text but keeps the post', () => {
    const content = mapSanityContent({
      news: [
        {
          id: 'n1',
          slug: 'post',
          title: 'Post',
          date: '2026-10-01',
          body: [],
          image: { alt: '', src: 'https://cdn.sanity.io/a.jpg', width: 10, height: 10 },
        },
      ],
    });
    expect(content.news).toHaveLength(1);
    expect(content.news[0]?.image).toBeUndefined();
  });
});
