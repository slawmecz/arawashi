/** Cloudflare Worker entry point: wires the real fetch and clock into the handler. */
import type { Env } from './env';
import { handleRequest } from './handler';

export default {
  fetch(request, env) {
    return handleRequest(request, env, {
      fetch: (input, init) => fetch(input, init),
      now: Date.now,
    });
  },
} satisfies ExportedHandler<Env>;
