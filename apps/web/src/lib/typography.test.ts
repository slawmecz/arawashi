import { describe, expect, it } from 'vitest';
import { NBSP, WORD_JOINER, nbsp, nbspHtml } from './typography';

/** "~" stands for a non-breaking space, "^" for a word joiner. */
const n = (text: string) => text.replaceAll('~', NBSP).replaceAll('^', WORD_JOINER);

describe('nbsp', () => {
  it('keeps single-letter words with the next word, including chains', () => {
    expect(nbsp('Pytania i odpowiedzi')).toBe(n('Pytania i~odpowiedzi'));
    expect(nbsp('W klubie i w domu')).toBe(n('W~klubie i~w~domu'));
    expect(nbsp('Skontaktuj się z nami (o tym w regulaminie)')).toBe(
      n('Skontaktuj się z~nami (o~tym w~regulaminie)'),
    );
  });

  it('does not touch letters inside words or at the end of the text', () => {
    expect(nbsp('Grupa testowa A')).toBe('Grupa testowa A');
    expect(nbsp('karate wkf')).toBe('karate wkf');
    expect(nbsp('Zapisz się')).toBe('Zapisz się');
  });

  it('keeps abbreviations, postal codes and dashes with their neighbours', () => {
    expect(nbsp('ul. Stawki 2, 00-193 Warszawa')).toBe(n('ul.~Stawki 2, 00-^193~Warszawa'));
    expect(nbsp('Sala nr 5')).toBe(n('Sala nr~5'));
    expect(nbsp('strony – nie przechowuje')).toBe(n('strony~– nie przechowuje'));
    // A long dash typed in the CMS becomes the short one used across the site.
    expect(nbsp('strony — nie')).toBe(n('strony~– nie'));
  });

  it('treats line breaks, tabs and repeated spaces like a space', () => {
    expect(nbsp('Zajęcia w\nsali i  na boisku')).toBe(n('Zajęcia w~sali i~na boisku'));
    expect(nbsp('ul.\tSzkolna')).toBe(n('ul.~Szkolna'));
  });

  it('never splits a postal code at its hyphen, and leaves other numbers alone', () => {
    expect(nbsp('00-950 Przykładowo')).toBe(n('00-^950~Przykładowo'));
    // Synthetic numbers only: a phone number, a register number and a date.
    expect(nbsp('Infolinia 600-700-800, rejestr 0000000000, 2026-01-15')).toBe(
      'Infolinia 600-700-800, rejestr 0000000000, 2026-01-15',
    );
  });

  it('only replaces spaces and adds invisible joiners, so the visible text stays the same', () => {
    const text = 'Zajęcia w sali i na boisku, ul. Szkolna 1, 55-011 Siechnice – zapraszamy';
    expect(nbsp(text).replaceAll(NBSP, ' ').replaceAll(WORD_JOINER, '')).toBe(text);
  });
});

describe('nbspHtml', () => {
  it('changes text between tags but never attributes', () => {
    expect(nbspHtml('<p>Trening w sali <a href="/a b/i w">i boisku</a></p>')).toBe(
      n('<p>Trening w~sali <a href="/a b/i w">i~boisku</a></p>'),
    );
  });

  it('keeps a single-letter word with an inline element that follows it', () => {
    expect(nbspHtml('<p>Napisz do nas z <a href="mailto:x@example.com">tej strony</a>.</p>')).toBe(
      n('<p>Napisz do nas z~<a href="mailto:x@example.com">tej strony</a>.</p>'),
    );
    expect(nbspHtml('<p>Gra w <strong>karate</strong></p>')).toBe(
      n('<p>Gra w~<strong>karate</strong></p>'),
    );
  });

  it('leaves a trailing single letter before a block tag alone', () => {
    expect(nbspHtml('<li>Grupa A </li><li>Grupa B</li>')).toBe('<li>Grupa A </li><li>Grupa B</li>');
  });

  it('handles empty input', () => {
    expect(nbspHtml('')).toBe('');
  });
});
