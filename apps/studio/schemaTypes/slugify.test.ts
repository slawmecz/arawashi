import { describe, expect, it } from 'vitest';
import { firstFreeSlug, slugify } from './slugify';

describe('firstFreeSlug', () => {
  it('keeps the address when nobody uses it', async () => {
    expect(await firstFreeSlug('zawody', async () => false)).toBe('zawody');
  });

  it('adds -2, -3… when other posts already use the address', async () => {
    const taken = new Set(['zawody', 'zawody-2']);
    expect(await firstFreeSlug('zawody', async (slug) => taken.has(slug))).toBe('zawody-3');
  });
});

/** The website accepts only this slug format (see apps/web/src/lib/content/schema.ts). */
const WEBSITE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('slugify', () => {
  it.each([
    ['Obóz letni 2027 – Żółć i Łódź!', 'oboz-letni-2027-zolc-i-lodz'],
    ['  Zawody  w Siechnicach  ', 'zawody-w-siechnicach'],
    ['ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż', 'acelnoszz-acelnoszz'],
    ['Café & karate', 'cafe-karate'],
  ])('turns %j into %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('always produces a slug the website accepts', () => {
    for (const title of [
      'Mistrzostwa Polski – 1. miejsce!',
      'Półkolonie 2027 (lipiec)',
      '!!!a!!!',
    ]) {
      expect(slugify(title)).toMatch(WEBSITE_SLUG);
    }
  });

  it('limits the length to 80 characters', () => {
    expect(slugify('a'.repeat(200))).toHaveLength(80);
  });

  it('never ends with a hyphen after cutting a long title', () => {
    // The 80th character of this slug is a hyphen.
    const slug = slugify(`${'a'.repeat(79)} bbb`);
    expect(slug).toBe('a'.repeat(79));
    expect(slug).toMatch(WEBSITE_SLUG);
  });
});
