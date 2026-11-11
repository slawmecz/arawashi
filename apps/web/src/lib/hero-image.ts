/**
 * Crops of the home page hero photo around the editor's focal point (Sanity hotspot), built at
 * build time with Sanity's image URL parameters (rect, w, h). Astro then downloads each crop
 * once and converts it to AVIF/WebP, so visitors never contact Sanity's CDN.
 */
import { createImageUrlBuilder } from '@sanity/image-url';
import type { HeroImage } from './content/schema';

/** https://cdn.sanity.io/images/<projectId>/<dataset>/<file> */
const SANITY_IMAGE_URL = /^https:\/\/cdn\.sanity\.io\/images\/([\w-]+)\/([\w-]+)\/[^/?#]+$/;

export interface HeroCrop {
  /** Sanity CDN URL of the crop (downloaded once at build time). */
  url: string;
  width: number;
  height: number;
  /** Widths for the srcset, never larger than the crop itself. */
  widths: number[];
}

/**
 * Portrait for phones (the subject fills a tall hero), wide landscape for larger screens.
 * The hero box is taller than these crops on most screens, so object-cover draws them wider
 * than the viewport; HeroPicture's sizes attribute accounts for that.
 */
const SHAPES = {
  phone: { aspect: 3 / 4, maxWidth: 1280, widths: [480, 720, 960, 1280] },
  desktop: { aspect: 2, maxWidth: 2400, widths: [1024, 1600, 2400] },
} as const;

/**
 * URL of a width×height crop centred on the hotspot (as far as the image allows).
 * Returns undefined for anything that is not a Sanity image URL.
 */
export function heroCropUrl(image: HeroImage, width: number, height: number): string | undefined {
  const match = SANITY_IMAGE_URL.exec(image.src);
  if (!match) return undefined;
  const [, projectId = '', dataset = ''] = match;
  return createImageUrlBuilder({ projectId, dataset })
    .image({
      asset: { url: image.src },
      ...(image.hotspot && { hotspot: image.hotspot }),
      ...(image.crop && { crop: image.crop }),
    })
    .width(width)
    .height(height)
    .fit('crop')
    .url();
}

/**
 * The phone and desktop crops, sized so the CDN never has to upscale: the limit is the area
 * the editor left after cropping in the Studio, not the whole original.
 */
export function heroCrops(image: HeroImage): { phone: HeroCrop; desktop: HeroCrop } | undefined {
  const { left = 0, right = 0, top = 0, bottom = 0 } = image.crop ?? {};
  const availableWidth = image.width * (1 - left - right);
  const availableHeight = image.height * (1 - top - bottom);
  const crop = (shape: (typeof SHAPES)[keyof typeof SHAPES]): HeroCrop | undefined => {
    const width = Math.floor(
      Math.min(shape.maxWidth, availableWidth, availableHeight * shape.aspect),
    );
    const height = Math.round(width / shape.aspect);
    const url = heroCropUrl(image, width, height);
    if (!url || width < 1 || height < 1) return undefined;
    const widths = shape.widths.filter((w) => w < width);
    return { url, width, height, widths: [...widths, width] };
  };
  const phone = crop(SHAPES.phone);
  const desktop = crop(SHAPES.desktop);
  return phone && desktop ? { phone, desktop } : undefined;
}
