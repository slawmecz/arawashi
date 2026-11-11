/**
 * Applies Polish typesetting (non-breaking spaces, see lib/typography.ts) to the text the
 * pages display, whatever the content source. Values used as identifiers or compared in code
 * (ids, slugs, URLs, dates, group names used by the schedule filter and the signup form)
 * are left unchanged.
 */
import { nbsp, nbspHtml } from '../typography';
import type { SiteContent } from './schema';

const opt = (text: string | undefined) => (text === undefined ? undefined : nbsp(text));

export function typesetContent(content: SiteContent): SiteContent {
  const { settings } = content;
  return {
    ...content,
    settings: {
      ...settings,
      address: opt(settings.address),
      venues: settings.venues.map((venue) => ({
        ...venue,
        name: nbsp(venue.name),
        address: nbsp(venue.address),
      })),
    },
    aboutHtml: nbspHtml(content.aboutHtml),
    groups: content.groups.map((group) => ({ ...group, description: opt(group.description) })),
    schedule: content.schedule.map((slot) => ({ ...slot, venue: opt(slot.venue) })),
    news: content.news.map((post) => ({
      ...post,
      title: nbsp(post.title),
      excerpt: opt(post.excerpt),
      bodyHtml: nbspHtml(post.bodyHtml),
    })),
    camps: content.camps.map((camp) => ({
      ...camp,
      title: nbsp(camp.title),
      location: opt(camp.location),
      price: opt(camp.price),
      descriptionHtml: nbspHtml(camp.descriptionHtml),
    })),
    achievements: content.achievements.map((item) => ({
      ...item,
      title: nbsp(item.title),
      descriptionHtml: nbspHtml(item.descriptionHtml),
    })),
    coaches: content.coaches.map((coach) => ({
      ...coach,
      role: opt(coach.role),
      rank: opt(coach.rank),
      bioHtml: nbspHtml(coach.bioHtml),
    })),
    documents: content.documents.map((doc) => ({
      ...doc,
      title: nbsp(doc.title),
      description: opt(doc.description),
    })),
    faq: content.faq.map((item) => ({
      ...item,
      question: nbsp(item.question),
      answerHtml: nbspHtml(item.answerHtml),
    })),
  };
}
