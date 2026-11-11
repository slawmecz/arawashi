/**
 * Synthetic content for E2E tests and local UI work (CONTENT_SOURCE=fixtures).
 * Everything here is invented and clearly marked as test data; production builds never use it.
 */
import type { SiteContent } from './schema';

const p = (text: string) => `<p>${text}</p>`;

export const FIXTURE_CONTENT: SiteContent = {
  settings: {
    address: 'ul. Testowa 1, 00-000 Przykładowo',
    phone: '+48 000 000 000',
    email: 'kontakt@example.com',
    nip: '000-000-00-00',
    bankAccount: '00 0000 0000 0000 0000 0000 0000',
    krs: '0000000000',
    isOpp: true,
    facebookUrl: 'https://www.facebook.com/example',
    instagramUrl: 'https://www.instagram.com/example',
    venues: [
      {
        name: 'Sala testowa',
        address: 'ul. Testowa 1, 00-000 Przykładowo',
        mapUrl: 'https://www.openstreetmap.org/',
      },
    ],
  },
  aboutHtml: p('Przykładowy opis klubu (dane testowe).'),
  groups: [
    { id: 'g1', name: 'Grupa testowa A', ageRange: '5–8 lat', description: 'Opis grupy A.' },
    { id: 'g2', name: 'Grupa testowa B', ageRange: '9–12 lat', description: 'Opis grupy B.' },
  ],
  schedule: [
    {
      id: 's1',
      groupName: 'Grupa testowa A',
      day: 2,
      start: '17:00',
      end: '18:00',
      venue: 'Sala testowa',
    },
    {
      id: 's2',
      groupName: 'Grupa testowa B',
      day: 2,
      start: '18:00',
      end: '19:30',
      venue: 'Sala testowa',
    },
    {
      id: 's3',
      groupName: 'Grupa testowa A',
      day: 4,
      start: '17:00',
      end: '18:00',
      venue: 'Sala testowa',
    },
  ],
  news: [
    {
      id: 'n1',
      slug: 'testowa-aktualnosc',
      title: 'Testowa aktualność',
      date: '2026-10-15',
      excerpt: 'Krótki opis testowej aktualności.',
      bodyHtml: p('Treść testowej aktualności.'),
    },
    {
      id: 'n2',
      slug: 'starsza-aktualnosc',
      title: 'Starsza testowa aktualność',
      date: '2026-09-01',
      bodyHtml: p('Treść starszej aktualności.'),
    },
  ],
  camps: [
    {
      id: 'c1',
      title: 'Testowy obóz letni',
      kind: 'oboz',
      startDate: '2027-07-01',
      endDate: '2027-07-10',
      location: 'Miejscowość testowa',
      price: '0 zł (dane testowe)',
      descriptionHtml: p('Program testowego obozu.'),
    },
  ],
  achievements: [
    {
      id: 'a1',
      title: 'Testowe osiągnięcie',
      date: '2026-06-01',
      descriptionHtml: p('Opis testowego osiągnięcia.'),
    },
  ],
  coaches: [
    {
      id: 't1',
      name: 'Trener Testowy',
      role: 'Trener główny',
      rank: '1 dan',
      bioHtml: p('Krótki testowy opis trenera.'),
    },
  ],
  documents: [
    {
      id: 'd1',
      title: 'Standardy ochrony małoletnich (test)',
      category: 'standardy',
      url: 'https://example.com/standardy.pdf',
    },
    {
      id: 'd2',
      title: 'Regulamin klubu (test)',
      category: 'regulamin',
      url: 'https://example.com/regulamin.pdf',
    },
  ],
  faq: [{ id: 'f1', question: 'Testowe pytanie?', answerHtml: p('Testowa odpowiedź.') }],
};
