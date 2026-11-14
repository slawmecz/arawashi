/**
 * Sanity Studio for the Arawashi website: Polish UI, a short menu laid out like the website,
 * and validation that protects children's privacy (photos need alt text and a consent
 * confirmation).
 */
import { plPLLocale } from '@sanity/locale-pl-pl';
import { visionTool } from '@sanity/vision';
import { defineConfig, defineLocaleResourceBundle } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes/documents';
import { SINGLETONS, structure } from './structure';

// The club's Sanity project. Project IDs are public (they appear in every Studio and API URL).
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'q5j90txn';
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';
const isDev = process.env.NODE_ENV === 'development';

/** Document menu items editors do not need (Sanity Canvas is a separate product). */
const HIDDEN_ACTIONS: ReadonlySet<string> = new Set([
  'linkToCanvas',
  'editInCanvas',
  'unlinkFromCanvas',
]);

/** Singletons can only be published, reverted or restored (not duplicated or deleted). */
const SINGLETON_ACTIONS: ReadonlySet<string> = new Set(['publish', 'discardChanges', 'restore']);

export default defineConfig({
  name: 'arawashi',
  title: 'Arawashi – panel strony',
  projectId,
  dataset,
  plugins: [
    structureTool({ structure }),
    plPLLocale(),
    // Query playground for the developer: only when running the Studio locally.
    ...(isDev ? [visionTool({ defaultApiVersion: '2026-11-01' })] : []),
  ],
  // The project runs on the free plan. Features of paid plans are switched off, so editors do
  // not start relying on something that disappears when a trial ends.
  tasks: { enabled: false },
  releases: { enabled: false },
  scheduledDrafts: { enabled: false },
  scheduledPublishing: { enabled: false },
  i18n: {
    bundles: [
      // The Polish translation says "Nowy {type}", which is wrong for feminine and neuter
      // types ("Nowy Aktualność"). This wording fits every type.
      defineLocaleResourceBundle({
        locale: 'pl-PL',
        namespace: 'structure',
        resources: {
          'panes.document-header-title.new.text': '{{schemaType}} – nowy wpis',
          'browser-document-title.new-document': '{{schemaType}} – nowy wpis',
        },
      }),
    ],
  },
  schema: {
    types: schemaTypes,
    // Singletons cannot be created again from the "new document" menu.
    templates: (templates) =>
      templates.filter(({ schemaType }) => !SINGLETONS.includes(schemaType)),
  },
  document: {
    comments: { enabled: false },
    actions: (actions, { schemaType }) =>
      actions.filter(({ action }) =>
        SINGLETONS.includes(schemaType)
          ? action !== undefined && SINGLETON_ACTIONS.has(action)
          : action === undefined || !HIDDEN_ACTIONS.has(action),
      ),
  },
});
