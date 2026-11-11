/** Unit tests for the typography check (node --test). Cases come from the final QA review. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findTypographyProblems, renderedText } from './typography-check.mjs';

const page = (body) =>
  `<!doctype html><html><head><title>i w</title></head><body>${body}</body></html>`;
const problems = (body) => findTypographyProblems(page(body));

describe('space before punctuation', () => {
  it('finds a full stop on its own line after a link, with or without text after it', () => {
    assert.equal(problems('<p>Skontaktuj się z&nbsp;<a href="/k/">nami</a>\n.</p>').length, 1);
    assert.equal(problems('<p>Zobacz <a href="/x/">regulamin</a> .</p><p>Dalej</p>').length, 1);
    // React SSR output: no whitespace after the punctuation.
    assert.equal(problems('<label>Wiem <a href="#r">więcej</a> .</label>').length, 1);
  });

  it('reports every case, not only the first one on a page', () => {
    assert.equal(problems('<p>Jeden <b>dwa</b> .</p><p>Trzy <b>cztery</b> ,</p>').length, 2);
  });

  it('accepts correct text', () => {
    assert.deepEqual(
      problems('<p>Skontaktuj się z&nbsp;nami. Tel. <a href="tel:1">+48 600</a></p>'),
      [],
    );
    assert.deepEqual(problems('<p>Wtorek, 17:00–18:00 · ul.&nbsp;Testowa 1</p>'), []);
    assert.deepEqual(problems('<p><strong>mistrzów</strong>.</p>'), []);
    // React SSR separates text nodes with empty comments; they render as nothing.
    assert.deepEqual(problems('<p>Wtorek<!-- -->,<!-- --> <span>17:00</span></p>'), []);
  });
});

describe('dashes', () => {
  it('rejects the long dash and accepts the short one', () => {
    assert.equal(problems('<p>Klub — wartości</p>').length, 1);
    assert.deepEqual(problems('<p>Klub – wartości, 5–8 lat</p>'), []);
  });
});

describe('hanging one-letter words', () => {
  it('finds a plain space, a line break and a non-breaking space followed by a line break', () => {
    assert.equal(problems('<p>Pytania i odpowiedzi</p>').length, 1);
    assert.equal(problems('<p>Skontaktuj się z\nnami teraz.</p>').length, 1);
    assert.equal(problems('<p>telefon i&nbsp;\n<span class="nowrap">e-mail</span></p>').length, 1);
  });

  it('looks across inline elements', () => {
    assert.equal(problems('<p>Napisz z <a href="/k/">tej strony</a></p>').length, 1);
    assert.equal(problems('<p><strong>Przyjdź z </strong>dzieckiem</p>').length, 1);
    assert.equal(problems('<p>Trening w <small>sali</small></p>').length, 1);
  });

  it('accepts non-breaking spaces and letters at the end of a block', () => {
    assert.deepEqual(problems('<p>Pytania i&nbsp;odpowiedzi, z&nbsp;<a href="/">nami</a></p>'), []);
    assert.deepEqual(problems('<ul><li>Grupa A</li><li>Grupa B</li></ul>'), []);
    assert.deepEqual(problems('<h3>Grupa testowa A</h3>\n<p>5–8 lat</p>'), []);
  });

  it('ignores the head, attributes, scripts, SVG and select options', () => {
    assert.deepEqual(problems('<img alt="i w domu" src="/a.png">'), []);
    assert.deepEqual(problems('<script>const a = "i w";</script><svg><text>i w</text></svg>'), []);
    assert.deepEqual(
      problems('<select><option>Nie wiem – o pomoc w wyborze</option></select>'),
      [],
    );
  });
});

describe('renderedText', () => {
  it('separates blocks and joins inline elements', () => {
    const text = renderedText(page('<p>A <b>b</b></p><p>c</p>'));
    assert.match(text, /A b/);
    assert.doesNotMatch(text, /bc/);
  });
});
