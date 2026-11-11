/**
 * Runs the real GROQ query (with groq-js, Sanity's reference implementation) against a fake
 * dataset shaped like the Studio documents. This catches query typos and field-name mismatches
 * between apps/studio and the website before a real Sanity project exists.
 */
import { evaluate, parse } from 'groq-js';
import { describe, expect, it } from 'vitest';
import { CONTENT_QUERY, mapSanityContent } from './sanity';
import { siteContentSchema } from './schema';

const block = (text: string) => ({
  _type: 'block',
  _key: 'k',
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: 's', text, marks: [] }],
});

const imageAsset = {
  _id: 'image-abc-800x600-jpg',
  _type: 'sanity.imageAsset',
  url: 'https://cdn.sanity.io/images/p/production/abc-800x600.jpg',
  metadata: { dimensions: { width: 800, height: 600 } },
};
const fileAsset = {
  _id: 'file-def-pdf',
  _type: 'sanity.fileAsset',
  url: 'https://cdn.sanity.io/files/p/production/def.pdf',
};
const imageRef = (consent: boolean, alt = 'Rozgrzewka na sali') => ({
  _type: 'image',
  asset: { _type: 'reference', _ref: imageAsset._id },
  alt,
  consent,
});

/** Documents exactly as the Studio schemas (apps/studio/schemaTypes) store them. */
const dataset = [
  imageAsset,
  fileAsset,
  {
    _id: 'siteSettings',
    _type: 'siteSettings',
    phone: '+48 000 000 000',
    isOpp: true,
    krs: '0000000000',
    venues: [{ _key: 'v', name: 'Sala', address: 'ul. A 1' }],
    heroImage: {
      _type: 'image',
      asset: { _type: 'reference', _ref: imageAsset._id },
      hotspot: { _type: 'sanity.imageHotspot', x: 0.7, y: 0.5, width: 0.3, height: 0.4 },
      crop: { _type: 'sanity.imageCrop', top: 0, bottom: 0, left: 0, right: 0 },
      source: 'Bank zdjęć (test)',
      rightsConfirmed: true,
    },
  },
  { _id: 'aboutPage', _type: 'aboutPage', body: [block('O klubie')] },
  { _id: 'g2', _type: 'trainingGroup', name: 'Starsi', order: 20 },
  { _id: 'g1', _type: 'trainingGroup', name: 'Młodsi', ageRange: '5–8 lat', order: 10 },
  {
    _id: 's1',
    _type: 'scheduleSlot',
    group: { _type: 'reference', _ref: 'g1' },
    day: 4,
    start: '17:00',
    end: '18:00',
  },
  {
    _id: 's2',
    _type: 'scheduleSlot',
    group: { _type: 'reference', _ref: 'g2' },
    day: 2,
    start: '18:00',
    end: '19:00',
  },
  {
    _id: 'n1',
    _type: 'newsPost',
    title: 'Ze zgodą',
    slug: { _type: 'slug', current: 'ze-zgoda' },
    publishedAt: '2026-10-02',
    body: [block('Treść')],
    mainImage: imageRef(true),
  },
  {
    _id: 'n2',
    _type: 'newsPost',
    title: 'Bez zgody',
    slug: { _type: 'slug', current: 'bez-zgody' },
    publishedAt: '2026-10-01',
    body: [block('Treść')],
    mainImage: imageRef(false),
  },
  { _id: 'n3', _type: 'newsPost', title: 'Bez adresu', publishedAt: '2026-10-03' },
  {
    _id: 'c1',
    _type: 'camp',
    title: 'Obóz',
    kind: 'oboz',
    startDate: '2027-07-01',
    endDate: '2027-07-10',
    description: [block('Program')],
  },
  { _id: 'a1', _type: 'achievement', title: 'Medal', date: '2026-06-01' },
  { _id: 't1', _type: 'coach', name: 'Trener', photo: imageRef(true, 'Trener na macie'), order: 1 },
  {
    _id: 'd1',
    _type: 'clubDocument',
    title: 'Regulamin',
    category: 'regulamin',
    file: { _type: 'file', asset: { _type: 'reference', _ref: fileAsset._id } },
  },
  { _id: 'f1', _type: 'faqItem', question: 'Pytanie?', answer: [block('Odpowiedź')], order: 1 },
];

async function runQuery(documents: unknown[] = dataset) {
  const result = await evaluate(parse(CONTENT_QUERY), { dataset: documents });
  return (await result.get()) as Record<string, unknown>;
}

describe('CONTENT_QUERY against Studio-shaped documents', () => {
  it('parses as valid GROQ', () => {
    expect(() => parse(CONTENT_QUERY)).not.toThrow();
  });

  it('produces valid site content end to end', async () => {
    const content = mapSanityContent(await runQuery());
    expect(siteContentSchema.safeParse(content).success).toBe(true);

    expect(content.settings.krs).toBe('0000000000');
    expect(content.aboutHtml).toBe('<p>O klubie</p>');
    expect(content.groups.map((g) => g.name)).toEqual(['Młodsi', 'Starsi']);
    // References are resolved and the schedule is sorted by weekday.
    expect(content.schedule.map((s) => [s.groupName, s.day])).toEqual([
      ['Starsi', 2],
      ['Młodsi', 4],
    ]);
    expect(content.camps[0]?.descriptionHtml).toBe('<p>Program</p>');
    expect(content.documents[0]?.url).toBe(fileAsset.url);
    expect(content.faq[0]?.answerHtml).toBe('<p>Odpowiedź</p>');
  });

  it('publishes photos only when the editor confirmed consent', async () => {
    const content = mapSanityContent(await runQuery());
    const bySlug = Object.fromEntries(content.news.map((post) => [post.slug, post]));
    expect(bySlug['ze-zgoda']?.image).toEqual({
      alt: 'Rozgrzewka na sali',
      src: imageAsset.url,
      width: 800,
      height: 600,
    });
    expect(bySlug['bez-zgody']).toBeDefined();
    expect(bySlug['bez-zgody']?.image).toBeUndefined();
    expect(content.coaches[0]?.photo?.alt).toBe('Trener na macie');
  });

  it('passes the hero photo with its focal point only when the rights are confirmed', async () => {
    const content = mapSanityContent(await runQuery());
    expect(content.settings.heroImage).toEqual({
      src: imageAsset.url,
      width: 800,
      height: 600,
      hotspot: { x: 0.7, y: 0.5, width: 0.3, height: 0.4 },
      crop: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const unconfirmed = dataset.map((doc) =>
      doc._id === 'siteSettings' && 'heroImage' in doc
        ? { ...doc, heroImage: { ...doc.heroImage, rightsConfirmed: false } }
        : doc,
    );
    const without = mapSanityContent(await runQuery(unconfirmed));
    expect(without.settings.heroImage).toBeUndefined();
    // The rest of the settings is unaffected.
    expect(without.settings.krs).toBe('0000000000');
  });

  it('skips posts without a URL slug and sorts news newest first', async () => {
    const content = mapSanityContent(await runQuery());
    expect(content.news.map((post) => post.slug)).toEqual(['ze-zgoda', 'bez-zgody']);
  });
});
