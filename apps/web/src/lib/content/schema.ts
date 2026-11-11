/**
 * Shape of all club content used by the pages, validated with Zod after it is fetched.
 * The CMS (Sanity) and the test fixtures are both mapped into this shape, so the pages never
 * depend on where the content came from.
 */
import { z } from 'zod';

/** Optional non-empty text. (All URLs below use z.httpUrl(): z.url() also accepts javascript:.) */
const optionalText = z.string().trim().min(1).optional();

export const siteImageSchema = z.object({
  src: z.httpUrl(),
  alt: z.string().trim().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/**
 * Editor's focal point and crop (fractions of the image), from Sanity's hotspot tool.
 * Tiny floating-point overshoots (e.g. 1.0000000000000002) are clamped, not rejected.
 */
const fraction = z
  .number()
  .min(-0.01)
  .max(1.01)
  .transform((value) => Math.min(1, Math.max(0, value)));

/**
 * Background photo of the home page hero. Shown only when the editor confirmed the rights
 * (filtered in the GROQ query). The hotspot drives the phone and desktop crops.
 */
export const heroImageSchema = z.object({
  src: z.httpUrl(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  hotspot: z.object({ x: fraction, y: fraction, width: fraction, height: fraction }).optional(),
  crop: z.object({ top: fraction, bottom: fraction, left: fraction, right: fraction }).optional(),
});

export const venueSchema = z.object({
  name: z.string().trim().min(1),
  address: z.string().trim().min(1),
  mapUrl: z.httpUrl().optional(),
});

export const settingsSchema = z.object({
  address: optionalText,
  phone: optionalText,
  email: z.email().optional(),
  nip: optionalText,
  bankAccount: optionalText,
  krs: optionalText,
  /** Public benefit organisation: only then can people donate 1.5% of their tax. */
  isOpp: z.boolean(),
  facebookUrl: z.httpUrl().optional(),
  instagramUrl: z.httpUrl().optional(),
  venues: z.array(venueSchema),
  heroImage: heroImageSchema.optional(),
});

export const groupSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  ageRange: optionalText,
  description: optionalText,
});

/** Day of the week, 1 = Monday … 7 = Sunday. */
export const weekdaySchema = z.number().int().min(1).max(7);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const scheduleSlotSchema = z.object({
  id: z.string(),
  groupName: z.string().trim().min(1),
  day: weekdaySchema,
  start: timeSchema,
  end: timeSchema,
  venue: optionalText,
});

export const newsPostSchema = z.object({
  id: z.string(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1),
  date: z.iso.date(),
  excerpt: optionalText,
  bodyHtml: z.string(),
  image: siteImageSchema.optional(),
});

export const campSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1),
  kind: z.enum(['oboz', 'polkolonie']),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  location: optionalText,
  price: optionalText,
  descriptionHtml: z.string(),
});

export const achievementSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1),
  date: z.iso.date(),
  descriptionHtml: z.string(),
});

export const coachSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  role: optionalText,
  rank: optionalText,
  bioHtml: z.string(),
  photo: siteImageSchema.optional(),
});

export const documentCategories = ['standardy', 'rodo', 'regulamin', 'inne'] as const;

export const clubDocumentSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1),
  description: optionalText,
  url: z.httpUrl(),
  category: z.enum(documentCategories),
});

export const faqItemSchema = z.object({
  id: z.string(),
  question: z.string().trim().min(1),
  answerHtml: z.string(),
});

export const siteContentSchema = z.object({
  settings: settingsSchema,
  aboutHtml: z.string(),
  groups: z.array(groupSchema),
  schedule: z.array(scheduleSlotSchema),
  news: z.array(newsPostSchema),
  camps: z.array(campSchema),
  achievements: z.array(achievementSchema),
  coaches: z.array(coachSchema),
  documents: z.array(clubDocumentSchema),
  faq: z.array(faqItemSchema),
});

export type SiteImage = z.infer<typeof siteImageSchema>;
export type HeroImage = z.infer<typeof heroImageSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type TrainingGroup = z.infer<typeof groupSchema>;
export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>;
export type NewsPost = z.infer<typeof newsPostSchema>;
export type Camp = z.infer<typeof campSchema>;
export type Achievement = z.infer<typeof achievementSchema>;
export type Coach = z.infer<typeof coachSchema>;
export type ClubDocument = z.infer<typeof clubDocumentSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;
export type SiteContent = z.infer<typeof siteContentSchema>;

/** Content used when no source is configured: every page shows its "coming soon" state. */
export const EMPTY_CONTENT: SiteContent = {
  settings: { isOpp: false, venues: [] },
  aboutHtml: '',
  groups: [],
  schedule: [],
  news: [],
  camps: [],
  achievements: [],
  coaches: [],
  documents: [],
  faq: [],
};
