/**
 * Polish typesetting at build time (no JavaScript for visitors). A non-breaking space (U+00A0)
 * keeps words together that Polish typography does not split at the end of a line:
 * - a single-letter word and the next word ("sierotki": a, i, o, u, w, z),
 * - common abbreviations and what follows them ("ul. Szkolna", "nr 5"),
 * - a postal code and the town ("00-193 Warszawa"),
 * - the word before a spaced dash, so a line never starts with "–".
 * A postal code is never split at its hyphen either: an invisible word joiner follows the hyphen.
 * It also turns a long dash (U+2014) into the short one (U+2013) used across the site.
 */
export const NBSP = '\u00a0';

/** Invisible WORD JOINER (U+2060): no line break is allowed where it stands. */
export const WORD_JOINER = String.fromCharCode(0x2060);

// A run of ordinary whitespace (spaces, tabs, line breaks from multi-line CMS fields) becomes
// one non-breaking space; HTML would collapse the run anyway.
const SINGLE_LETTER = /(?<=^|[\s(„])([aiouwzAIOUWZ])[ \t\r\n]+(?=\S)/g;
const ABBREVIATION =
  /(?<=^|[\s(„])(ul\.|al\.|pl\.|os\.|nr|tel\.|np\.|godz\.|św\.)[ \t\r\n]+(?=\S)/gi;
const POSTAL_CODE = /(?<=\b\d{2}-\d{3})[ \t\r\n]+(?=\p{L})/gu;
/** The hyphen of a postal code ("55-011"); browsers may otherwise break the line after it. */
const POSTAL_HYPHEN = /\b(\d{2})-(?=\d{3}\b)/g;
const BEFORE_DASH = /[ \t\r\n]+(?=[\u2013\u2014][ \t\r\n])/g;
const LONG_DASH = /\u2014/g;

/** Turns typeset text back into plain text (for URLs and search queries). */
export function plainText(text: string): string {
  return text.replaceAll(NBSP, ' ').replaceAll(WORD_JOINER, '');
}

/** Applies the non-breaking-space rules to plain text. */
export function nbsp(text: string): string {
  return (
    text
      .replace(LONG_DASH, '\u2013')
      .replace(SINGLE_LETTER, `$1${NBSP}`)
      .replace(ABBREVIATION, `$1${NBSP}`)
      .replace(POSTAL_CODE, NBSP)
      // After POSTAL_CODE, whose lookbehind needs the plain "00-000".
      .replace(POSTAL_HYPHEN, `$1-${WORD_JOINER}`)
      .replace(BEFORE_DASH, NBSP)
  );
}

const INLINE_TAG = /^<(?:a|abbr|b|code|em|i|mark|s|small|span|strong|sub|sup|time|u)\b/i;
const TRAILING_SINGLE_LETTER = /(?<=^|[\s(„])([aiouwzAIOUWZ])[ \t\r\n]+$/;

/**
 * Applies the same rules to the text of an HTML fragment (rich text from the CMS). Only text
 * between tags is changed, never tags or attributes. A single-letter word right before an
 * inline element ("z <a>…") is kept with the element's first word.
 */
export function nbspHtml(html: string): string {
  const parts = html.split(/(<[^>]*>)/);
  for (let i = 0; i < parts.length; i += 2) {
    let text = parts[i] ?? '';
    if (INLINE_TAG.test(parts[i + 1] ?? ''))
      text = text.replace(TRAILING_SINGLE_LETTER, `$1${NBSP}`);
    parts[i] = nbsp(text);
  }
  return parts.join('');
}
