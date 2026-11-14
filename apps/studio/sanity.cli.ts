/** Sanity CLI config (used by `sanity dev`, `sanity build` and `sanity deploy`). */
import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    // The club's project (public identifier); environment variables can override it.
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'q5j90txn',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  // The Studio is published at https://<studioHost>.sanity.studio
  studioHost: 'arawashi',
  // appId identifies the deployed Studio, so `sanity deploy` does not ask for it.
  deployment: { appId: 'od0l6d0o9tgwltwjxdp0n0ov', autoUpdates: true },
});
