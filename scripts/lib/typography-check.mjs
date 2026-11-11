/**
 * Polish typography rules checked on the text of a built HTML page (used by
 * scripts/check-built-html.mjs, unit-tested in typography-check.test.mjs).
 *
 * The page is first reduced to an approximation of its rendered text: block elements become
 * hard boundaries, inline elements are removed (so "z <a>nami</a>" reads "z nami"), and
 * attributes, scripts, styles, SVG, templates, <select> (options never wrap) and comments are
 * dropped. Then:
 * - punctuation: a word followed by whitespace and . , ; : ! ? is an error ("nami .");
 * - long dash: the site uses only the short dash (U+2013), never U+2014;
 * - hanging letters: a one-letter word (a, i, o, u, w, z) followed by any breakable whitespace
 *   (space, tab, line break; also after a non-breaking space) and a next word is an error.
 */
const NBSP = String.fromCharCode(0xa0);
/** Marks block boundaries in the reduced text (U+2029 PARAGRAPH SEPARATOR). */
const BLOCK = String.fromCharCode(0x2029);

const SKIPPED = /<(script|style|svg|template|select)\b[\s\S]*?<\/\1\s*>|<!--[\s\S]*?-->/gi;
const BLOCK_TAGS =
  'address|article|aside|blockquote|br|button|caption|dd|details|dialog|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|label|legend|li|main|nav|noscript|ol|option|p|section|summary|table|tbody|td|tfoot|th|thead|tr|ul';
const BLOCK_TAG = new RegExp(`<\\/?(?:${BLOCK_TAGS})\\b[^>]*>`, 'gi');
const ANY_TAG = /<[^>]*>/g;

const ENTITIES = { '&nbsp;': NBSP, '&#160;': NBSP, '&amp;': '&', '&quot;': '"', '&#39;': "'" };
const decode = (text) => text.replace(/&nbsp;|&#160;|&amp;|&quot;|&#39;/g, (e) => ENTITIES[e]);

/** Reduces an HTML document to its visible body text, with BLOCK between block elements. */
export function renderedText(html) {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  // Skipped elements and comments render as nothing; React SSR puts <!-- --> between text nodes.
  return decode(body.replace(SKIPPED, '').replace(BLOCK_TAG, BLOCK).replace(ANY_TAG, ''));
}

/** The site uses the short dash (U+2013) only; a long dash (U+2014) is an error. */
const LONG_DASH = new RegExp(String.fromCharCode(0x2014), 'g');
/** A letter, digit or closing quote/bracket, ordinary whitespace, then punctuation. */
const SPACE_BEFORE_PUNCTUATION = /([\p{L}\p{N}”)])[ \t\r\n]+([.,;:!?])(?![\p{L}\p{N}])/gu;
/**
 * A one-letter word, optional non-breaking spaces, then at least one breakable whitespace
 * character and a next word in the same block.
 */
const HANGING_LETTER = new RegExp(
  `(?<=^|[\\s(„${BLOCK}])[aiouwzAIOUWZ](?=${NBSP}*[ \\t\\r\\n][ \\t\\r\\n${NBSP}]*[^\\s])`,
  'g',
);

const snippet = (text, index) =>
  JSON.stringify(
    text
      .slice(Math.max(0, index - 30), index + 30)
      .replaceAll(BLOCK, ' | ')
      .replace(/[ \t\r\n]+/g, ' ')
      .replaceAll(NBSP, '~'),
  );

/** All typography problems in one HTML document, as human-readable strings. */
export function findTypographyProblems(html) {
  const text = renderedText(html);
  const problems = [];
  for (const m of text.matchAll(SPACE_BEFORE_PUNCTUATION)) {
    problems.push(`space before "${m[2]}" in ${snippet(text, m.index)}`);
  }
  for (const m of text.matchAll(LONG_DASH)) {
    problems.push(`long dash in ${snippet(text, m.index)} (the site uses the short dash)`);
  }
  for (const m of text.matchAll(HANGING_LETTER)) {
    problems.push(`hanging "${m[0]}" in ${snippet(text, m.index)} (~ = non-breaking space)`);
  }
  return problems;
}
