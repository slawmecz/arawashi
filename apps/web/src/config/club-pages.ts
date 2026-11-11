/** Sub-pages of the "Klub" section, in menu order. The 1.5% page exists only for OPP clubs. */
export interface ClubPage {
  href: string;
  title: string;
  description: string;
}

export function clubPages(isOpp: boolean): ClubPage[] {
  const pages: ClubPage[] = [
    { href: '/klub/kadra/', title: 'Kadra trenerska', description: 'Poznaj naszych trenerów.' },
    {
      href: '/klub/osiagniecia/',
      title: 'Osiągnięcia',
      description: 'Najważniejsze sukcesy klubu.',
    },
    {
      href: '/klub/dokumenty/',
      title: 'Dokumenty',
      description: 'Standardy ochrony małoletnich, regulamin i dokumenty RODO.',
    },
    {
      href: '/klub/faq/',
      title: 'Pytania i odpowiedzi',
      description: 'Odpowiedzi na najczęstsze pytania.',
    },
  ];
  if (isOpp) {
    pages.push({
      href: '/klub/przekaz-1-5-procent/',
      title: 'Przekaż 1,5% podatku',
      description: 'Wesprzyj klub w rocznym zeznaniu podatkowym.',
    });
  }
  return pages;
}
