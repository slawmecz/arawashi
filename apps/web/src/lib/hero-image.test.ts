import { describe, expect, it } from 'vitest';
import type { HeroImage } from './content/schema';
import { heroCropUrl, heroCrops } from './hero-image';

const image: HeroImage = {
  src: 'https://cdn.sanity.io/images/abc123/production/0123456789abcdef-3000x2000.jpg',
  width: 3000,
  height: 2000,
  // The subject (e.g. fists and belt) sits right of centre.
  hotspot: { x: 0.8, y: 0.5, width: 0.2, height: 0.3 },
};

const params = (url: string | undefined) => Object.fromEntries(new URL(url ?? '').searchParams);

describe('heroCrops', () => {
  it('crops a portrait for phones around the hotspot, kept inside the image', () => {
    const crops = heroCrops(image);
    expect(crops?.phone).toMatchObject({
      width: 1280,
      height: 1707,
      widths: [480, 720, 960, 1280],
    });
    // 1500×2000 px window: centred on x = 2400 it would end at 3150, so it is pushed back to 3000.
    expect(params(crops?.phone.url)).toMatchObject({
      rect: '1500,0,1500,2000',
      w: '1280',
      h: '1707',
      fit: 'crop',
    });
    expect(crops?.phone.url.startsWith(image.src)).toBe(true);
  });

  it('crops a 2:1 landscape for larger screens, centred on the hotspot vertically', () => {
    const crops = heroCrops(image);
    expect(crops?.desktop).toMatchObject({
      width: 2400,
      height: 1200,
      widths: [1024, 1600, 2400],
    });
    expect(params(crops?.desktop.url)).toMatchObject({
      rect: '0,250,3000,1500',
      w: '2400',
      h: '1200',
    });
  });

  it('never asks the CDN to upscale a small original', () => {
    const crops = heroCrops({
      src: 'https://cdn.sanity.io/images/abc123/production/fedcba9876543210-800x600.jpg',
      width: 800,
      height: 600,
    });
    expect(crops?.phone).toMatchObject({ width: 450, height: 600, widths: [450] });
    expect(crops?.desktop).toMatchObject({ width: 800, height: 400, widths: [800] });
  });

  it("sizes the crops from the area left after the editor's crop", () => {
    // The editor kept only the right half (1500×2000 px of the 3000×2000 original).
    const cropped = { ...image, crop: { left: 0.5, right: 0, top: 0, bottom: 0 } };
    const crops = heroCrops(cropped);
    expect(crops?.desktop).toMatchObject({ width: 1500, height: 750, widths: [1024, 1500] });
    expect(crops?.phone).toMatchObject({ width: 1280, height: 1707 });
  });

  it('ignores anything that is not a Sanity image URL', () => {
    const other = { ...image, src: 'https://example.com/images/abc123/production/a-3000x2000.jpg' };
    expect(heroCropUrl(other, 100, 100)).toBeUndefined();
    expect(heroCrops(other)).toBeUndefined();
  });
});
