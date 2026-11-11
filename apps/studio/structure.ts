/**
 * Studio menu in Polish. "Dane klubu" and "Poznaj Arawashi" are singletons (exactly one
 * document each), so editors open them directly instead of picking from a list.
 */
import type { StructureResolver } from 'sanity/structure';

export const SINGLETONS = ['siteSettings', 'aboutPage'];

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Strona klubu')
    .items([
      S.listItem().title('Aktualności').child(S.documentTypeList('newsPost').title('Aktualności')),
      S.divider(),
      S.listItem()
        .title('Grupy treningowe')
        .child(S.documentTypeList('trainingGroup').title('Grupy')),
      S.listItem()
        .title('Grafik zajęć')
        .child(S.documentTypeList('scheduleSlot').title('Grafik zajęć')),
      S.listItem().title('Obozy i półkolonie').child(S.documentTypeList('camp').title('Obozy')),
      S.divider(),
      S.listItem().title('Kadra trenerska').child(S.documentTypeList('coach').title('Kadra')),
      S.listItem()
        .title('Osiągnięcia')
        .child(S.documentTypeList('achievement').title('Osiągnięcia')),
      S.listItem().title('Dokumenty').child(S.documentTypeList('clubDocument').title('Dokumenty')),
      S.listItem().title('Pytania i odpowiedzi').child(S.documentTypeList('faqItem').title('FAQ')),
      S.divider(),
      S.listItem()
        .title('Poznaj Arawashi (o klubie)')
        .child(S.document().schemaType('aboutPage').documentId('aboutPage')),
      S.listItem()
        .title('Dane klubu i kontakt')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
    ]);
