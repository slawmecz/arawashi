/**
 * Studio menu in Polish, laid out like the website's own menu (Aktualności, Treningi, Obozy,
 * Klub, Kontakt), so editors find each thing where they see it on the site.
 * "Poznaj Arawashi" and "Kontakt i dane klubu" are singletons (exactly one document each), so
 * they open directly instead of showing a list.
 */
import { CalendarIcon } from '@sanity/icons/Calendar';
import { ClockIcon } from '@sanity/icons/Clock';
import { DocumentPdfIcon } from '@sanity/icons/DocumentPdf';
import { DocumentTextIcon } from '@sanity/icons/DocumentText';
import { EnvelopeIcon } from '@sanity/icons/Envelope';
import { HelpCircleIcon } from '@sanity/icons/HelpCircle';
import { HomeIcon } from '@sanity/icons/Home';
import { InfoOutlineIcon } from '@sanity/icons/InfoOutline';
import { StarIcon } from '@sanity/icons/Star';
import { SunIcon } from '@sanity/icons/Sun';
import { UserIcon } from '@sanity/icons/User';
import { UsersIcon } from '@sanity/icons/Users';
import type { StructureResolver } from 'sanity/structure';

export const SINGLETONS = ['siteSettings', 'aboutPage'];

/** Lists follow the same order as the website (the "Kolejność" field, lower first). */
const BY_ORDER = [{ field: 'order', direction: 'asc' as const }];

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Strona klubu')
    .items([
      S.listItem()
        .title('Aktualności')
        .icon(DocumentTextIcon)
        .child(
          S.documentTypeList('newsPost')
            .title('Aktualności')
            .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }]),
        ),
      S.listItem()
        .title('Treningi')
        .icon(CalendarIcon)
        .child(
          S.list()
            .title('Treningi')
            .items([
              S.listItem()
                .title('Grafik zajęć (dni i godziny)')
                .icon(ClockIcon)
                .child(
                  S.documentTypeList('scheduleSlot')
                    .title('Grafik zajęć')
                    .defaultOrdering([
                      { field: 'day', direction: 'asc' },
                      { field: 'start', direction: 'asc' },
                    ]),
                ),
              S.listItem()
                .title('Grupy')
                .icon(UsersIcon)
                .child(
                  S.documentTypeList('trainingGroup').title('Grupy').defaultOrdering(BY_ORDER),
                ),
            ]),
        ),
      S.listItem()
        .title('Obozy i półkolonie')
        .icon(SunIcon)
        .child(
          S.documentTypeList('camp')
            .title('Obozy i półkolonie')
            .defaultOrdering([{ field: 'startDate', direction: 'desc' }]),
        ),
      S.listItem()
        .title('Klub')
        .icon(HomeIcon)
        .child(
          S.list()
            .title('Klub')
            .items([
              S.listItem()
                .title('Poznaj Arawashi (o klubie)')
                .icon(InfoOutlineIcon)
                .child(S.document().schemaType('aboutPage').documentId('aboutPage')),
              S.listItem()
                .title('Kadra trenerska')
                .icon(UserIcon)
                .child(
                  S.documentTypeList('coach').title('Kadra trenerska').defaultOrdering(BY_ORDER),
                ),
              S.listItem()
                .title('Osiągnięcia')
                .icon(StarIcon)
                .child(
                  S.documentTypeList('achievement')
                    .title('Osiągnięcia')
                    .defaultOrdering([{ field: 'date', direction: 'desc' }]),
                ),
              S.listItem()
                .title('Dokumenty')
                .icon(DocumentPdfIcon)
                .child(
                  S.documentTypeList('clubDocument').title('Dokumenty').defaultOrdering(BY_ORDER),
                ),
              S.listItem()
                .title('Pytania i odpowiedzi')
                .icon(HelpCircleIcon)
                .child(
                  S.documentTypeList('faqItem')
                    .title('Pytania i odpowiedzi')
                    .defaultOrdering(BY_ORDER),
                ),
            ]),
        ),
      S.listItem()
        .title('Kontakt i dane klubu')
        .icon(EnvelopeIcon)
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
    ]);
