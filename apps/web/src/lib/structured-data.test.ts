import { describe, expect, it } from 'vitest';
import { sportsOrganization, toJsonLd } from './structured-data';
import { NBSP } from './typography';

describe('sportsOrganization', () => {
  it('includes only the contact data that is available', () => {
    const data = sportsOrganization(
      { isOpp: false, venues: [], phone: '+48 000 000 000' },
      'https://arawashi.eu/',
      'https://arawashi.eu/logo.png',
    );
    expect(data).toMatchObject({ '@type': 'SportsOrganization', telephone: '+48 000 000 000' });
    expect(data).not.toHaveProperty('email');
    expect(data).not.toHaveProperty('sameAs');
  });

  it('lists venues and social profiles', () => {
    const data = sportsOrganization(
      {
        isOpp: false,
        facebookUrl: 'https://facebook.com/x',
        venues: [{ name: 'Sala', address: 'ul. A 1' }],
      },
      'https://arawashi.eu/',
      'https://arawashi.eu/logo.png',
    );
    expect(data.sameAs).toEqual(['https://facebook.com/x']);
    expect(data.location).toEqual([
      { '@type': 'SportsActivityLocation', name: 'Sala', address: 'ul. A 1' },
    ]);
  });
});

describe('toJsonLd', () => {
  it('turns non-breaking spaces from typesetting into plain spaces', () => {
    expect(toJsonLd({ a: `ul.${NBSP}Testowa` })).toBe('{"a":"ul. Testowa"}');
  });

  it('escapes "<" so content cannot close the script tag', () => {
    expect(toJsonLd({ a: '</script>' })).toBe('{"a":"\\u003c/script>"}');
  });
});
