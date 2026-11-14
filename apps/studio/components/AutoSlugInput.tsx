/**
 * The web address (slug) of a news post fills itself in from the title, so editors never have
 * to think about it. It follows the title until the post is first published; after that it
 * stays the same, so links shared on Facebook keep working when the title is edited later.
 *
 * The address is written into the draft while the editor types, so the standard "Publish"
 * button publishes it together with the rest of the post.
 */
import { useEffect, useRef } from 'react';
import { set, useClient, useEditState, useFormValue, type SlugInputProps } from 'sanity';
import { firstFreeSlug, slugify } from '../schemaTypes/slugify';

const API_VERSION = '2026-11-01';

/** Wait until the editor stops typing before updating the address. */
const DEBOUNCE_MS = 400;

export function AutoSlugInput(props: SlugInputProps) {
  const title = useFormValue(['title']);
  const typeName = String(useFormValue(['_type']) ?? '');
  const publishedId = String(useFormValue(['_id']) ?? '').replace(/^drafts\./, '');
  const { published, ready } = useEditState(publishedId, typeName);
  const client = useClient({ apiVersion: API_VERSION });
  const publishedSlug = (published?.['slug'] as { current?: string } | undefined)?.current;
  const current = props.value?.current;

  // The form passes a new onChange on every render; a ref keeps the effect from restarting.
  const onChange = useRef(props.onChange);
  onChange.current = props.onChange;

  useEffect(() => {
    // Once published, the address never changes.
    if (!ready || publishedSlug || typeof title !== 'string') return;
    const base = slugify(title);
    if (!base) return;
    let cancelled = false;
    const isTaken = async (slug: string) =>
      Boolean(
        await client.fetch<string | null>(
          '*[_type == $type && slug.current == $slug && !(_id in [$id, $draftId])][0]._id',
          { type: typeName, slug, id: publishedId, draftId: `drafts.${publishedId}` },
        ),
      );
    const timer = setTimeout(() => {
      firstFreeSlug(base, isTaken)
        .then((slug) => {
          if (!cancelled && slug !== current) {
            onChange.current(set({ _type: 'slug', current: slug }));
          }
        })
        // Without a connection the address stays as it is; the field's validation then tells
        // the editor that it is missing, so nothing is published without an address.
        .catch((error: unknown) => console.warn('[slug] could not check the address', error));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, publishedSlug, title, current, client, typeName, publishedId]);

  // Editors only see the address; it cannot be typed by hand.
  return props.renderDefault({ ...props, readOnly: true });
}
