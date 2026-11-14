/**
 * Document types edited by the club. Field names must match the GROQ query in
 * apps/web/src/lib/content/sanity.ts.
 */
import { ClockIcon } from '@sanity/icons/Clock';
import { DocumentPdfIcon } from '@sanity/icons/DocumentPdf';
import { DocumentTextIcon } from '@sanity/icons/DocumentText';
import { EnvelopeIcon } from '@sanity/icons/Envelope';
import { HelpCircleIcon } from '@sanity/icons/HelpCircle';
import { InfoOutlineIcon } from '@sanity/icons/InfoOutline';
import { StarIcon } from '@sanity/icons/Star';
import { SunIcon } from '@sanity/icons/Sun';
import { UserIcon } from '@sanity/icons/User';
import { UsersIcon } from '@sanity/icons/Users';
import { defineField, defineType } from 'sanity';
import { AutoSlugInput } from '../components/AutoSlugInput';
import { consentImage, orderField, richText } from './shared';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Kontakt i dane klubu',
  type: 'document',
  icon: EnvelopeIcon,
  fields: [
    defineField({ name: 'phone', title: 'Telefon', type: 'string' }),
    defineField({
      name: 'email',
      title: 'E-mail',
      type: 'string',
      validation: (rule) => rule.email(),
    }),
    defineField({ name: 'address', title: 'Adres korespondencyjny', type: 'string' }),
    defineField({ name: 'nip', title: 'NIP', type: 'string' }),
    defineField({ name: 'krs', title: 'Numer KRS', type: 'string' }),
    defineField({ name: 'bankAccount', title: 'Numer konta bankowego', type: 'string' }),
    defineField({
      name: 'isOpp',
      title: 'Klub jest organizacją pożytku publicznego (OPP)',
      description:
        'Zaznacz tylko wtedy, gdy klub jest w wykazie OPP – pojawi się strona „Przekaż 1,5% podatku” (wymaga numeru KRS).',
      type: 'boolean',
      initialValue: false,
      // Hidden from editors: the 1.5% page shows the club's own KRS, so it may only be switched
      // on after the developer has checked the club in the official OPP list.
      hidden: true,
    }),
    defineField({
      name: 'heroImage',
      title: 'Zdjęcie w tle hasła na stronie głównej',
      // Uploaded files are reachable by URL immediately (public dataset), even before publishing.
      description:
        'Ogólne zdjęcie z karate, na którym nie da się rozpoznać dzieci (np. ręce i pas, sylwetka) – z banku zdjęć albo wygenerowane przez AI. Przeciągnij kółko na najważniejszą część zdjęcia: telefony pokażą wycinek wokół niego. Bez zdjęcia strona pokazuje ciemne tło. Wgrany plik jest od razu dostępny pod swoim adresem internetowym.',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'source',
          title: 'Źródło i licencja',
          description:
            'Np. „Unsplash, autor: …, licencja Unsplash” albo „wygenerowane w … zgodnie z regulaminem narzędzia”.',
          type: 'string',
          hidden: ({ parent }) => !(parent as { asset?: unknown } | undefined)?.asset,
          validation: (rule) =>
            rule.max(300).custom((value, context) => {
              const hasImage = Boolean((context.parent as { asset?: unknown } | undefined)?.asset);
              return !hasImage || (typeof value === 'string' && value.trim() !== '')
                ? true
                : 'Podaj źródło i licencję zdjęcia.';
            }),
        }),
        defineField({
          name: 'rightsConfirmed',
          title:
            'Potwierdzam: mamy prawo użyć tego zdjęcia na stronie i nie widać na nim rozpoznawalnych dzieci',
          type: 'boolean',
          hidden: ({ parent }) => !(parent as { asset?: unknown } | undefined)?.asset,
          validation: (rule) =>
            rule.custom((value, context) => {
              const hasImage = Boolean((context.parent as { asset?: unknown } | undefined)?.asset);
              return !hasImage || value === true
                ? true
                : 'Bez tego potwierdzenia zdjęcie nie zostanie opublikowane.';
            }),
        }),
      ],
    }),
    defineField({ name: 'facebookUrl', title: 'Facebook (adres strony)', type: 'url' }),
    defineField({ name: 'instagramUrl', title: 'Instagram (adres profilu)', type: 'url' }),
    defineField({
      name: 'venues',
      title: 'Miejsca treningów',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'venue',
          title: 'Sala',
          fields: [
            defineField({
              name: 'name',
              title: 'Nazwa',
              type: 'string',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'address',
              title: 'Adres',
              type: 'string',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'mapUrl',
              title: 'Link do mapy (np. z Google Maps lub OpenStreetMap)',
              type: 'url',
            }),
          ],
        },
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Kontakt i dane klubu' }) },
});

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'Poznaj Arawashi (o klubie)',
  type: 'document',
  icon: InfoOutlineIcon,
  fields: [richText('body', 'Treść')],
  preview: { prepare: () => ({ title: 'Poznaj Arawashi' }) },
});

export const trainingGroup = defineType({
  name: 'trainingGroup',
  title: 'Grupa treningowa',
  type: 'document',
  icon: UsersIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Nazwa grupy',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'ageRange', title: 'Wiek', description: 'Np. „5–8 lat”', type: 'string' }),
    defineField({ name: 'description', title: 'Krótki opis', type: 'text', rows: 3 }),
    orderField,
  ],
  preview: { select: { title: 'name', subtitle: 'ageRange' } },
});

export const scheduleSlot = defineType({
  name: 'scheduleSlot',
  title: 'Zajęcia w grafiku',
  type: 'document',
  icon: ClockIcon,
  fields: [
    defineField({
      name: 'group',
      title: 'Grupa',
      type: 'reference',
      to: [{ type: 'trainingGroup' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'day',
      title: 'Dzień tygodnia',
      type: 'number',
      options: {
        list: [
          { title: 'Poniedziałek', value: 1 },
          { title: 'Wtorek', value: 2 },
          { title: 'Środa', value: 3 },
          { title: 'Czwartek', value: 4 },
          { title: 'Piątek', value: 5 },
          { title: 'Sobota', value: 6 },
          { title: 'Niedziela', value: 7 },
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'start',
      title: 'Początek (GG:MM)',
      type: 'string',
      validation: (r) => r.required().regex(TIME, { name: 'godzina, np. 17:30' }),
    }),
    defineField({
      name: 'end',
      title: 'Koniec (GG:MM)',
      type: 'string',
      validation: (r) => r.required().regex(TIME, { name: 'godzina, np. 18:30' }),
    }),
    defineField({ name: 'venue', title: 'Sala', type: 'string' }),
  ],
  preview: {
    select: { group: 'group.name', day: 'day', start: 'start', end: 'end' },
    prepare: ({ group, day, start, end }) => ({
      title: String(group ?? 'Grupa'),
      subtitle: `${['', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'][Number(day)] ?? ''} ${start ?? ''}–${end ?? ''}`,
    }),
  },
});

export const newsPost = defineType({
  name: 'newsPost',
  title: 'Aktualność',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Tytuł',
      type: 'string',
      validation: (r) => r.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Adres strony',
      description:
        'Tworzy się sam z tytułu. Po pierwszej publikacji już się nie zmienia, żeby udostępnione linki działały.',
      type: 'slug',
      components: { input: AutoSlugInput },
      // Must match the website's slug rule, otherwise the post would be skipped by the build.
      validation: (r) =>
        r.custom((value) =>
          SLUG.test((value as { current?: string } | undefined)?.current ?? '')
            ? true
            : 'Wpisz tytuł – adres strony utworzy się sam.',
        ),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Data',
      type: 'date',
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (r) => r.required(),
    }),
    defineField({ name: 'excerpt', title: 'Krótki opis (na liście)', type: 'text', rows: 2 }),
    consentImage('mainImage', 'Zdjęcie główne'),
    richText('body', 'Treść'),
  ],
  orderings: [
    { title: 'Najnowsze', name: 'dateDesc', by: [{ field: 'publishedAt', direction: 'desc' }] },
  ],
  preview: { select: { title: 'title', subtitle: 'publishedAt', media: 'mainImage' } },
});

export const camp = defineType({
  name: 'camp',
  title: 'Obóz / półkolonie',
  type: 'document',
  icon: SunIcon,
  fields: [
    defineField({ name: 'title', title: 'Nazwa', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'kind',
      title: 'Rodzaj',
      type: 'string',
      options: {
        list: [
          { title: 'Obóz', value: 'oboz' },
          { title: 'Półkolonie', value: 'polkolonie' },
        ],
        layout: 'radio',
      },
      initialValue: 'oboz',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'startDate', title: 'Od', type: 'date', validation: (r) => r.required() }),
    defineField({
      name: 'endDate',
      title: 'Do',
      type: 'date',
      validation: (r) =>
        r.required().custom((end, context) => {
          const start = (context.document as { startDate?: string } | undefined)?.startDate;
          return !start || !end || end >= start
            ? true
            : 'Data końca nie może być przed datą początku.';
        }),
    }),
    defineField({ name: 'location', title: 'Miejsce', type: 'string' }),
    defineField({ name: 'price', title: 'Cena', description: 'Np. „1 600 zł”', type: 'string' }),
    richText('description', 'Opis, program i zapisy'),
  ],
  preview: { select: { title: 'title', subtitle: 'startDate' } },
});

export const achievement = defineType({
  name: 'achievement',
  title: 'Osiągnięcie',
  type: 'document',
  icon: StarIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Tytuł',
      description: 'Imiona i nazwiska dzieci podawaj tylko za zgodą rodziców.',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'date', title: 'Data', type: 'date', validation: (r) => r.required() }),
    richText('description', 'Opis (opcjonalnie)'),
  ],
  preview: { select: { title: 'title', subtitle: 'date' } },
});

export const coach = defineType({
  name: 'coach',
  title: 'Trener',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Imię i nazwisko',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'role',
      title: 'Funkcja',
      description: 'Np. „Trener główny”',
      type: 'string',
    }),
    defineField({ name: 'rank', title: 'Stopień', description: 'Np. „3 dan”', type: 'string' }),
    consentImage('photo', 'Zdjęcie'),
    richText('bio', 'Krótki opis'),
    orderField,
  ],
  preview: { select: { title: 'name', subtitle: 'role', media: 'photo' } },
});

export const clubDocument = defineType({
  name: 'clubDocument',
  title: 'Dokument do pobrania',
  type: 'document',
  icon: DocumentPdfIcon,
  fields: [
    defineField({ name: 'title', title: 'Nazwa', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'category',
      title: 'Kategoria',
      type: 'string',
      options: {
        list: [
          { title: 'Standardy ochrony małoletnich', value: 'standardy' },
          { title: 'RODO', value: 'rodo' },
          { title: 'Regulamin', value: 'regulamin' },
          { title: 'Inne', value: 'inne' },
        ],
      },
      initialValue: 'inne',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'description', title: 'Opis (opcjonalnie)', type: 'string' }),
    defineField({
      name: 'file',
      title: 'Plik (PDF)',
      type: 'file',
      options: { accept: 'application/pdf' },
      validation: (r) => r.required(),
    }),
    orderField,
  ],
  preview: { select: { title: 'title', subtitle: 'category' } },
});

export const faqItem = defineType({
  name: 'faqItem',
  title: 'Pytanie i odpowiedź',
  type: 'document',
  icon: HelpCircleIcon,
  fields: [
    defineField({
      name: 'question',
      title: 'Pytanie',
      type: 'string',
      validation: (r) => r.required(),
    }),
    richText('answer', 'Odpowiedź'),
    orderField,
  ],
  preview: { select: { title: 'question' } },
});

export const schemaTypes = [
  siteSettings,
  aboutPage,
  trainingGroup,
  scheduleSlot,
  newsPost,
  camp,
  achievement,
  coach,
  clubDocument,
  faqItem,
];
