/**
 * schema.org JSON-LD for search engines: the club as a SportsOrganization
 * (name, logo, contact, social profiles and training venues from the CMS).
 */
import type { Settings } from './content/schema';
import { NBSP } from './typography';

export function sportsOrganization(settings: Settings, siteUrl: string, logoUrl: string) {
  const sameAs = [settings.facebookUrl, settings.instagramUrl].filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: 'Arawashi',
    legalName: 'Stowarzyszenie Sportu i Rekreacji „Arawashi”',
    sport: 'Karate',
    url: siteUrl,
    logo: logoUrl,
    ...(settings.phone && { telephone: settings.phone }),
    ...(settings.email && { email: settings.email }),
    ...(settings.nip && { taxID: settings.nip }),
    ...(sameAs.length > 0 && { sameAs }),
    ...(settings.venues.length > 0 && {
      location: settings.venues.map((venue) => ({
        '@type': 'SportsActivityLocation',
        name: venue.name,
        address: venue.address,
      })),
    }),
  };
}

/** Serialises JSON-LD safely for an inline <script> (no closing-tag injection). */
export function toJsonLd(data: unknown): string {
  // Typeset texts carry non-breaking spaces, which mean nothing to search engines.
  return JSON.stringify(data).replaceAll(NBSP, ' ').replaceAll('<', '\\u003c');
}
