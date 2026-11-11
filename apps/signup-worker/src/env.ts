/** Bindings and configuration of the signup Worker (see wrangler.jsonc and README.md). */
export interface Env {
  /** Comma-separated list of origins allowed to post the form, e.g. "https://arawashi.eu". */
  ALLOWED_ORIGINS: string;
  /** Sender address; its domain must be verified in Brevo. */
  MAIL_FROM: string;
  /** Sender display name. */
  MAIL_FROM_NAME: string;
  /** Club inbox that receives signups (secret: kept out of the public repository). */
  MAIL_TO: string;
  /** Brevo transactional e-mail API key (secret). */
  BREVO_API_KEY: string;
  /** Cloudflare Turnstile secret key (secret). */
  TURNSTILE_SECRET_KEY: string;
  /** Per-IP rate limiter binding; optional so local development works without it. */
  SIGNUP_RATE_LIMITER?: RateLimit;
}

/** Side effects injected into the handler, so it can be unit-tested without the Workers runtime. */
export interface Deps {
  fetch: typeof fetch;
  now: () => number;
}
