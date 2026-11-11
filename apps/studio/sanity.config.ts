/**
 * Sanity Studio for the Arawashi website: Polish UI, a simple menu and validation that
 * protects children's privacy (photos need alt text and a consent confirmation).
 * The project ID and dataset come from environment variables (see .env.example).
 */
import { plPLLocale } from '@sanity/locale-pl-pl';
import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes/documents';
import { SINGLETONS, structure } from './structure';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? 'replace-me';
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production';

export default defineConfig({
  name: 'arawashi',
  title: 'Arawashi – panel strony',
  projectId,
  dataset,
  plugins: [
    structureTool({ structure }),
    plPLLocale(),
    // Query playground for the developer; editors can ignore it.
    visionTool({ defaultApiVersion: '2026-11-01' }),
  ],
  schema: {
    types: schemaTypes,
    // Singletons cannot be created again from the "new document" menu.
    templates: (templates) =>
      templates.filter(({ schemaType }) => !SINGLETONS.includes(schemaType)),
  },
  document: {
    // Singletons cannot be duplicated or deleted.
    actions: (actions, { schemaType }) =>
      SINGLETONS.includes(schemaType)
        ? actions.filter(
            ({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action),
          )
        : actions,
  },
});
