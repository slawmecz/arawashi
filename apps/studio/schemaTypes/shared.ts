/**
 * Building blocks shared by several document types: simple rich text and photos with
 * a required description (alt text) and a required publication-consent confirmation.
 */
import { defineArrayMember, defineField, type Rule } from 'sanity';

const SAFE_LINK = /^(https?:|mailto:|tel:|\/)/i;

/**
 * Rich text with as few buttons as possible: paragraphs, one heading level, bullet lists, bold
 * and links. (The website can also render other block styles; they are just not offered here.)
 */
export function richText(name: string, title: string, description?: string) {
  return defineField({
    name,
    title,
    description,
    type: 'array',
    of: [
      defineArrayMember({
        type: 'block',
        styles: [
          { title: 'Akapit', value: 'normal' },
          { title: 'Nagłówek', value: 'h2' },
        ],
        lists: [{ title: 'Wypunktowanie', value: 'bullet' }],
        marks: {
          decorators: [{ title: 'Pogrubienie', value: 'strong' }],
          annotations: [
            {
              name: 'link',
              type: 'object',
              title: 'Link',
              fields: [
                {
                  name: 'href',
                  type: 'string',
                  title: 'Adres (https://…, mailto:… lub tel:…)',
                  validation: (rule: Rule) =>
                    rule
                      .required()
                      .custom((value: unknown) =>
                        typeof value === 'string' && SAFE_LINK.test(value)
                          ? true
                          : 'Adres musi zaczynać się od https://, mailto:, tel: lub /',
                      ),
                },
              ],
            },
          ],
        },
      }),
    ],
  });
}

/** True when the image field (the parent of a sub-field) has an uploaded file. */
const hasAsset = (parent: unknown) => Boolean((parent as { asset?: unknown } | undefined)?.asset);

/**
 * An optional photo. Once a file is uploaded, it can only be published with a description
 * (alt text) and a confirmation that the club has the consent of the people shown (or of the
 * parents of children shown). Without a file both questions stay hidden and nothing blocks
 * publishing. The website also ignores photos without the confirmation.
 */
export function consentImage(name: string, title: string) {
  return defineField({
    name,
    title,
    type: 'image',
    // Uploaded files are reachable by URL immediately (public dataset), even before publishing.
    description:
      'Nieobowiązkowe. Wgrywaj tylko zdjęcia, na których publikację masz już zgodę – wgrany plik jest od razu dostępny pod swoim adresem internetowym. Przed wgraniem wyłącz w telefonie zapisywanie lokalizacji w zdjęciach.',
    options: { hotspot: true },
    fields: [
      defineField({
        name: 'alt',
        title: 'Opis zdjęcia (dla osób niewidomych)',
        description: 'Np. „Zawodnicy podczas rozgrzewki na sali”. Nie podawaj nazwisk dzieci.',
        type: 'string',
        hidden: ({ parent }) => !hasAsset(parent),
        validation: (rule) =>
          rule
            .max(200)
            .custom((value, context) =>
              !hasAsset(context.parent) || (typeof value === 'string' && value.trim() !== '')
                ? true
                : 'Opisz krótko, co widać na zdjęciu.',
            ),
      }),
      defineField({
        name: 'consent',
        title:
          'Potwierdzam: mamy zgodę osób na zdjęciu (a przy dzieciach – zgodę rodziców) albo nikogo nie da się rozpoznać',
        type: 'boolean',
        hidden: ({ parent }) => !hasAsset(parent),
        // No initial value: it would create an empty photo object in every new document.
        validation: (rule) =>
          rule.custom((value, context) =>
            !hasAsset(context.parent) || value === true
              ? true
              : 'Bez tego potwierdzenia zdjęcie nie zostanie opublikowane.',
          ),
      }),
    ],
  });
}

/** Sort order field (lower numbers first). */
export const orderField = defineField({
  name: 'order',
  title: 'Kolejność',
  description: 'Mniejsza liczba = wyżej na liście.',
  type: 'number',
  initialValue: 10,
});
