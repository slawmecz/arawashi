import { describe, expect, it } from 'vitest';
import { ariaCurrentFor, withTrailingSlash } from './url';

describe('withTrailingSlash', () => {
  it('adds a missing trailing slash', () => {
    expect(withTrailingSlash('/klub')).toBe('/klub/');
  });

  it('keeps an existing trailing slash', () => {
    expect(withTrailingSlash('/klub/')).toBe('/klub/');
  });
});

describe('ariaCurrentFor', () => {
  it('marks the exact page', () => {
    expect(ariaCurrentFor('/treningi/', '/treningi/')).toBe('page');
  });

  it('marks the parent section of a sub-page', () => {
    expect(ariaCurrentFor('/klub/kadra/', '/klub/')).toBe('true');
  });

  it('ignores unrelated pages', () => {
    expect(ariaCurrentFor('/kontakt/', '/klub/')).toBeUndefined();
  });

  it('treats the home page link as current only on the home page', () => {
    expect(ariaCurrentFor('/', '/')).toBe('page');
    expect(ariaCurrentFor('/klub/', '/')).toBeUndefined();
  });

  it('does not match sections that only share a prefix', () => {
    expect(ariaCurrentFor('/klubowicze/', '/klub/')).toBeUndefined();
  });

  it('handles paths without a trailing slash', () => {
    expect(ariaCurrentFor('/treningi', '/treningi/')).toBe('page');
  });
});
