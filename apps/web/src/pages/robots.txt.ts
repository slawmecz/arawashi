/** robots.txt generated at build time (see lib/robots.ts). */
import type { APIRoute } from 'astro';
import { SITE_STAGE } from 'astro:env/server';
import { robotsTxt } from '../lib/robots';

export const GET: APIRoute = ({ site }) =>
  new Response(robotsTxt(SITE_STAGE === 'test', site ?? 'https://arawashi.eu'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
