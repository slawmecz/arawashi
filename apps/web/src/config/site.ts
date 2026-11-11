/**
 * Static site configuration: names, URLs, navigation and partner organisations.
 * Content the club edits (contact details, schedule, news...) will come from the CMS,
 * so it is deliberately not stored here.
 */
import type { ImageMetadata } from 'astro';
import clubLogo from '../assets/logos/arawashi-logo.png';
import gminaSiechniceLogo from '../assets/logos/gmina-siechnice-logo.jpg';
import pukLogo from '../assets/logos/polska-unia-karate-logo.jpg';

export const site = {
  name: 'Arawashi',
  fullName: 'Stowarzyszenie Sportu i Rekreacji „Arawashi”',
  url: 'https://arawashi.eu',
  description: 'Arawashi — klub karate WKF z gminy Siechnice. Szacunek, dyscyplina, charakter.',
  logo: clubLogo,
} as const;

export interface NavLink {
  label: string;
  href: string;
}

/** Main menu, in display order. */
export const mainNav: readonly NavLink[] = [
  { label: 'Aktualności', href: '/aktualnosci/' },
  { label: 'Klub', href: '/klub/' },
  { label: 'Treningi', href: '/treningi/' },
  { label: 'Obozy', href: '/obozy/' },
  { label: 'Kontakt', href: '/kontakt/' },
];

/** Call to action shown next to the menu. */
export const signupLink: NavLink = { label: 'Zapisz się', href: '/zapisz-sie/' };

export interface Partner {
  name: string;
  /** Short name shown when there is no logo file yet. */
  shortName: string;
  href: string;
  /** Missing until the official logo file is available; a text badge is shown instead. */
  logo?: ImageMetadata;
}

/** Partner organisations shown in the footer, in display order. */
export const partners: readonly Partner[] = [
  {
    name: 'Gmina Siechnice',
    shortName: 'Siechnice',
    href: 'https://www.siechnice.gmina.pl/',
    logo: gminaSiechniceLogo,
  },
  {
    name: 'Polska Unia Karate',
    shortName: 'PUK',
    href: 'https://karate-polska.pl/',
    logo: pukLogo,
  },
  { name: 'World Karate Federation', shortName: 'WKF', href: 'https://www.wkf.net/' },
];
