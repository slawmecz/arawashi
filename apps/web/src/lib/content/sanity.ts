/**
 * Fetches published content from Sanity at build time and maps it to the site's content shape.
 *
 * Privacy rules enforced here (in addition to the Studio's own validation):
 * - only published documents are queried (drafts stay private);
 * - an image is used only when the editor confirmed publication consent (for the home page
 *   hero photo: the right to use it and that no child can be recognised);
 * - log messages contain document types and IDs only, never content (CI logs are public).
 */
import { toHTML, type PortableTextComponents } from '@portabletext/to-html';
import { createClient } from '@sanity/client';
import { z } from 'zod';
import {
  achievementSchema,
  campSchema,
  clubDocumentSchema,
  coachSchema,
  faqItemSchema,
  groupSchema,
  heroImageSchema,
  newsPostSchema,
  scheduleSlotSchema,
  settingsSchema,
  siteImageSchema,
  type HeroImage,
  type SiteContent,
  type SiteImage,
} from './schema';

/** One GROQ query for everything the site needs. Field names match apps/studio/schemaTypes. */
export const CONTENT_QUERY = `{
  "settings": *[_type == "siteSettings"][0]{
    address, phone, email, nip, bankAccount, krs, isOpp, facebookUrl, instagramUrl,
    venues[]{name, address, mapUrl},
    "heroImage": select(heroImage.rightsConfirmed == true => heroImage{
      "src": asset->url,
      "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height,
      hotspot{x, y, width, height}, crop{top, bottom, left, right}
    })
  },
  "about": *[_type == "aboutPage"][0].body,
  "groups": *[_type == "trainingGroup"] | order(order asc, name asc){
    "id": _id, name, ageRange, description
  },
  "schedule": *[_type == "scheduleSlot" && defined(group->name)] | order(day asc, start asc){
    "id": _id, "groupName": group->name, day, start, end, venue
  },
  "news": *[_type == "newsPost" && defined(slug.current)] | order(publishedAt desc){
    "id": _id, "slug": slug.current, title, "date": publishedAt, excerpt, body,
    "image": select(mainImage.consent == true => mainImage{
      alt, "src": asset->url,
      "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height
    })
  },
  "camps": *[_type == "camp"] | order(startDate asc){
    "id": _id, title, kind, startDate, endDate, location, price, description
  },
  "achievements": *[_type == "achievement"] | order(date desc){
    "id": _id, title, date, description
  },
  "coaches": *[_type == "coach"] | order(order asc, name asc){
    "id": _id, name, role, rank, bio,
    "photo": select(photo.consent == true => photo{
      alt, "src": asset->url,
      "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height
    })
  },
  "documents": *[_type == "clubDocument" && defined(file.asset)] | order(order asc, title asc){
    "id": _id, title, description, category, "url": file.asset->url
  },
  "faq": *[_type == "faqItem"] | order(order asc){
    "id": _id, question, answer
  }
}`;

const SAFE_URL = /^(https?:|mailto:|tel:|\/|#)/i;

const portableTextComponents: PortableTextComponents = {
  marks: {
    // Only allow safe link schemes; anything else is rendered as plain text.
    link: ({ children, value }) => {
      const href = typeof value?.href === 'string' ? value.href.trim() : '';
      if (!SAFE_URL.test(href)) return children;
      const external = /^https?:/i.test(href) && !href.startsWith('https://arawashi.eu');
      const rel = external ? ' rel="noopener noreferrer"' : '';
      return `<a href="${escapeAttribute(href)}"${rel}>${children}</a>`;
    },
  },
};

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

/** Renders Sanity Portable Text to HTML (text is escaped by the renderer). */
export function portableTextToHtml(blocks: unknown): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';
  return toHTML(blocks, { components: portableTextComponents });
}

/** Replaces null values with undefined, so optional schema fields accept them. */
function withoutNulls<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutNulls) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, withoutNulls(v)]),
    ) as T;
  }
  return value;
}

/** Validates each item separately so one incomplete document cannot break the whole build. */
function validItems<S extends z.ZodType>(type: string, items: unknown, schema: S): z.infer<S>[] {
  if (!Array.isArray(items)) return [];
  const result: z.infer<S>[] = [];
  for (const item of items) {
    const parsed = schema.safeParse(withoutNulls(item));
    if (parsed.success) result.push(parsed.data);
    else {
      const id = (item as { id?: unknown })?.id;
      console.warn(`[content] skipped invalid ${type} document ${String(id ?? '?')}`);
    }
  }
  return result;
}

type RawRecord = Record<string, unknown>;
const asRecords = (value: unknown): RawRecord[] =>
  Array.isArray(value) ? (value as RawRecord[]) : [];

/** Keeps only http(s) URLs (rejects javascript:, data: and malformed values). */
function httpUrlOrUndefined(value: unknown): string | undefined {
  return z.httpUrl().safeParse(value).success ? (value as string) : undefined;
}

/** An incomplete image (e.g. missing alt text) is dropped on its own, keeping the document. */
function validImage(value: unknown): SiteImage | undefined {
  const parsed = siteImageSchema.safeParse(withoutNulls(value));
  return parsed.success ? parsed.data : undefined;
}

/** A broken hero photo is dropped on its own; the hero then shows its gradient. */
function validHeroImage(value: unknown): HeroImage | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = heroImageSchema.safeParse(withoutNulls(value));
  if (!parsed.success)
    console.warn('[content] invalid siteSettings hero image, using the gradient');
  return parsed.success ? parsed.data : undefined;
}

/** Maps the raw GROQ result to the site's content shape. Pure function: unit-tested. */
export function mapSanityContent(raw: RawRecord): SiteContent {
  const settingsRaw = withoutNulls((raw['settings'] ?? {}) as RawRecord);
  const settings = settingsSchema.safeParse({
    ...settingsRaw,
    // A bad link drops only that link, not the whole contact section.
    facebookUrl: httpUrlOrUndefined(settingsRaw['facebookUrl']),
    instagramUrl: httpUrlOrUndefined(settingsRaw['instagramUrl']),
    isOpp: settingsRaw['isOpp'] === true,
    heroImage: validHeroImage(settingsRaw['heroImage']),
    venues: asRecords(settingsRaw['venues']).map((venue) => ({
      ...venue,
      mapUrl: httpUrlOrUndefined(venue['mapUrl']),
    })),
  });
  if (!settings.success) console.warn('[content] invalid siteSettings document, using defaults');

  return {
    settings: settings.success ? settings.data : { isOpp: false, venues: [] },
    aboutHtml: portableTextToHtml(raw['about']),
    groups: validItems('trainingGroup', raw['groups'], groupSchema),
    schedule: validItems(
      'scheduleSlot',
      asRecords(raw['schedule']).map((slot) => ({ ...slot, day: Number(slot['day']) })),
      scheduleSlotSchema,
    ),
    news: validItems(
      'newsPost',
      asRecords(raw['news']).map(({ body, image, ...post }) => ({
        ...post,
        image: validImage(image),
        bodyHtml: portableTextToHtml(body),
      })),
      newsPostSchema,
    ),
    camps: validItems(
      'camp',
      asRecords(raw['camps']).map(({ description, ...camp }) => ({
        ...camp,
        descriptionHtml: portableTextToHtml(description),
      })),
      campSchema,
    ),
    achievements: validItems(
      'achievement',
      asRecords(raw['achievements']).map(({ description, ...item }) => ({
        ...item,
        descriptionHtml: portableTextToHtml(description),
      })),
      achievementSchema,
    ),
    coaches: validItems(
      'coach',
      asRecords(raw['coaches']).map(({ bio, photo, ...coach }) => ({
        ...coach,
        photo: validImage(photo),
        bioHtml: portableTextToHtml(bio),
      })),
      coachSchema,
    ),
    documents: validItems('clubDocument', raw['documents'], clubDocumentSchema),
    faq: validItems(
      'faqItem',
      asRecords(raw['faq']).map(({ answer, ...item }) => ({
        ...item,
        answerHtml: portableTextToHtml(answer),
      })),
      faqItemSchema,
    ),
  };
}

export interface SanityConfig {
  projectId: string;
  dataset: string;
  /** Read-only token, needed only for a private dataset (keeps unpublished uploads private). */
  token?: string | undefined;
}

/** Fetches all published content. A token is used only when the dataset is private. */
export async function fetchSanityContent({
  projectId,
  dataset,
  token,
}: SanityConfig): Promise<SiteContent> {
  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2026-11-01',
    useCdn: false,
    perspective: 'published',
    ...(token ? { token } : {}),
  });
  const raw = await client.fetch<RawRecord>(CONTENT_QUERY);
  return mapSanityContent(raw ?? {});
}
