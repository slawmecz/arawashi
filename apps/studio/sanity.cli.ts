/** Sanity CLI config (used by `sanity dev`, `sanity build` and `sanity deploy`). */
import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'replace-me',
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  },
  // The Studio is published at https://<studioHost>.sanity.studio
  studioHost: 'arawashi',
  deployment: { autoUpdates: true },
});
