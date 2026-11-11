/**
 * Request handler of the signup Worker.
 *
 * Flow: CORS + origin check → rate limit → JSON parsing → honeypot → schema validation →
 * timing check → Turnstile verification → one e-mail to the club. Nothing is stored and
 * request bodies are never logged.
 */
import {
  MAX_FILL_TIME_MS,
  MIN_FILL_TIME_MS,
  firstErrorPerField,
  signupRequestSchema,
  type SignupRequest,
} from '@arawashi/signup-schema';
import { buildSignupEmail } from './email';
import type { Deps, Env } from './env';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';
const MAX_BODY_BYTES = 10_000;

/** Machine-readable error codes returned to the form. */
export type ErrorCode =
  | 'not_found'
  | 'method_not_allowed'
  | 'forbidden_origin'
  | 'rate_limited'
  | 'unsupported_media_type'
  | 'payload_too_large'
  | 'invalid_json'
  | 'validation'
  | 'expired'
  | 'captcha'
  | 'delivery';

function parseAllowedOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...corsHeaders(origin),
      ...extra,
    },
  });
}

function fail(
  code: ErrorCode,
  status: number,
  origin: string | null,
  extra: Record<string, unknown> = {},
) {
  return json({ ok: false, error: code, ...extra }, status, origin);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Asks Cloudflare whether the Turnstile token is valid. Any failure counts as "not verified". */
export async function verifyTurnstile(
  token: string,
  ip: string | null,
  secret: string,
  fetchFn: typeof fetch,
): Promise<boolean> {
  if (!token) return false;
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set('remoteip', ip);
  try {
    const response = await fetchFn(TURNSTILE_VERIFY_URL, { method: 'POST', body: form });
    if (!response.ok) return false;
    const outcome: unknown = await response.json();
    return isRecord(outcome) && outcome['success'] === true;
  } catch {
    return false;
  }
}

/** Sends the signup to the club inbox through the Brevo transactional API. */
export async function sendSignupEmail(data: SignupRequest, env: Env, deps: Deps): Promise<boolean> {
  const email = buildSignupEmail(data, new Date(deps.now()));
  try {
    const response = await deps.fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: env.MAIL_FROM_NAME, email: env.MAIL_FROM },
        to: [{ email: env.MAIL_TO }],
        replyTo: { email: data.parentEmail, name: data.parentName },
        subject: email.subject,
        textContent: email.text,
        htmlContent: email.html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function handleRequest(request: Request, env: Env, deps: Deps): Promise<Response> {
  const url = new URL(request.url);
  const requestOrigin = request.headers.get('Origin');
  const origin =
    requestOrigin && parseAllowedOrigins(env.ALLOWED_ORIGINS).includes(requestOrigin)
      ? requestOrigin
      : null;

  if (url.pathname === '/health') return json({ ok: true }, 200, null);
  if (url.pathname !== '/signup') return fail('not_found', 404, origin);

  if (request.method === 'OPTIONS') {
    return origin
      ? new Response(null, { status: 204, headers: corsHeaders(origin) })
      : new Response(null, { status: 403 });
  }
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405, origin, {
      Allow: 'POST, OPTIONS',
    });
  }
  if (!origin) return fail('forbidden_origin', 403, null);

  const ip = request.headers.get('CF-Connecting-IP');
  if (env.SIGNUP_RATE_LIMITER) {
    const { success } = await env.SIGNUP_RATE_LIMITER.limit({ key: ip ?? 'unknown' });
    if (!success) return fail('rate_limited', 429, origin);
  }

  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) {
    return fail('unsupported_media_type', 415, origin);
  }
  // Reject oversized bodies before reading them when the size is declared, then check bytes.
  const declaredLength = Number(request.headers.get('Content-Length') ?? '0');
  if (declaredLength > MAX_BODY_BYTES) return fail('payload_too_large', 413, origin);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return fail('payload_too_large', 413, origin);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail('invalid_json', 400, origin);
  }

  // Honeypot: real users never see this field. Pretend success so bots learn nothing.
  if (isRecord(body) && typeof body['website'] === 'string' && body['website'].trim() !== '') {
    return json({ ok: true }, 200, origin);
  }

  const parsed = signupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail('validation', 400, origin, { fieldErrors: firstErrorPerField(parsed.error) });
  }
  const data = parsed.data;

  // Fill time is measured by the browser's monotonic clock, so device clock errors don't matter.
  // Filled in faster than a human could: drop silently, like the honeypot.
  if (data.fillTimeMs < MIN_FILL_TIME_MS) return json({ ok: true }, 200, origin);
  if (data.fillTimeMs > MAX_FILL_TIME_MS) return fail('expired', 400, origin);

  if (!(await verifyTurnstile(data.turnstileToken, ip, env.TURNSTILE_SECRET_KEY, deps.fetch))) {
    return fail('captcha', 400, origin);
  }

  if (!(await sendSignupEmail(data, env, deps))) return fail('delivery', 502, origin);
  return json({ ok: true }, 200, origin);
}
