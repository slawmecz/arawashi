import type { SignupRequest } from '@arawashi/signup-schema';
import { describe, expect, it, vi } from 'vitest';
import { buildSignupEmail, escapeHtml } from '../src/email';
import type { Env } from '../src/env';
import { handleRequest } from '../src/handler';

const NOW = Date.parse('2026-11-07T10:00:00Z');
const ORIGIN = 'https://arawashi.eu';

/** Synthetic test data only. */
const validBody: SignupRequest = {
  signupFor: 'child',
  childName: 'Jan Testowy',
  childBirthDate: '2016-05-20',
  group: 'Dzieci 9–12 lat',
  parentName: 'Anna Testowa',
  parentPhone: '+48 600 700 800',
  parentEmail: 'anna.testowa@example.com',
  privacyAcknowledged: true,
  guardianConfirmed: true,
  fillTimeMs: 60_000,
  turnstileToken: 'valid-token',
  website: '',
};

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    ALLOWED_ORIGINS: 'https://arawashi.eu, https://www.arawashi.eu',
    MAIL_FROM: 'formularz@example.com',
    MAIL_FROM_NAME: 'Strona testowa',
    MAIL_TO: 'club@example.com',
    BREVO_API_KEY: 'brevo-key',
    TURNSTILE_SECRET_KEY: 'turnstile-secret',
    ...overrides,
  };
}

/** Fake upstream services: Turnstile answers `captcha`, Brevo answers with `brevoStatus`. */
function makeFetch({ captcha = true, brevoStatus = 201 } = {}) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('turnstile')) return Response.json({ success: captcha });
    if (url.includes('brevo')) return new Response('{}', { status: brevoStatus });
    throw new Error(`unexpected fetch: ${url}`);
  });
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://signup.example.workers.dev/signup', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function run(request: Request, env = makeEnv(), fetchFn = makeFetch()) {
  const response = await handleRequest(request, env, {
    fetch: fetchFn as typeof fetch,
    now: () => NOW,
  });
  const text = await response.text();
  return { response, body: text ? (JSON.parse(text) as Record<string, unknown>) : null, fetchFn };
}

function brevoCall(fetchFn: ReturnType<typeof makeFetch>) {
  const call = fetchFn.mock.calls.find(([input]) => String(input).includes('brevo'));
  if (!call) return null;
  const init = (call as unknown as [unknown, RequestInit])[1];
  return { headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) };
}

describe('signup Worker', () => {
  it('answers the health check', async () => {
    const { response, body } = await run(new Request('https://x.dev/health'));
    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  it('returns 404 for unknown paths', async () => {
    const { response } = await run(new Request('https://x.dev/other'));
    expect(response.status).toBe(404);
  });

  it('answers the CORS preflight for the site origin', async () => {
    const request = new Request('https://x.dev/signup', {
      method: 'OPTIONS',
      headers: { Origin: ORIGIN },
    });
    const { response } = await run(request);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  });

  it('rejects the preflight and the POST from other origins', async () => {
    const preflight = new Request('https://x.dev/signup', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example' },
    });
    expect((await run(preflight)).response.status).toBe(403);

    const { response, fetchFn } = await run(post(validBody, { Origin: 'https://evil.example' }));
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rejects methods other than POST', async () => {
    const { response } = await run(
      new Request('https://x.dev/signup', { headers: { Origin: ORIGIN } }),
    );
    expect(response.status).toBe(405);
  });

  it('verifies Turnstile and e-mails a valid signup to the club', async () => {
    const { response, body, fetchFn } = await run(
      post(validBody, { 'CF-Connecting-IP': '203.0.113.7' }),
    );
    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(response.headers.get('Cache-Control')).toBe('no-store');

    const turnstile = fetchFn.mock.calls.find(([input]) => String(input).includes('turnstile'));
    const form = (turnstile as unknown as [unknown, RequestInit])[1].body as URLSearchParams;
    expect(form.get('secret')).toBe('turnstile-secret');
    expect(form.get('response')).toBe('valid-token');
    expect(form.get('remoteip')).toBe('203.0.113.7');

    const email = brevoCall(fetchFn);
    expect(email?.headers['api-key']).toBe('brevo-key');
    expect(email?.body.to).toEqual([{ email: 'club@example.com' }]);
    expect(email?.body.replyTo).toEqual({
      email: 'anna.testowa@example.com',
      name: 'Anna Testowa',
    });
    expect(email?.body.textContent).toContain('Jan Testowy');
  });

  it('e-mails an adult who signs up themselves, replying to that adult', async () => {
    const adultBody: SignupRequest = {
      signupFor: 'self',
      childName: 'Adam Testowy',
      childBirthDate: '1990-03-15',
      group: 'Dorośli',
      parentPhone: '600 700 800',
      parentEmail: 'adam.testowy@example.com',
      privacyAcknowledged: true,
      fillTimeMs: 60_000,
      turnstileToken: 'valid-token',
      website: '',
    };
    const { response, fetchFn } = await run(post(adultBody));
    expect(response.status).toBe(200);
    const email = brevoCall(fetchFn);
    expect(email?.body.replyTo).toEqual({
      email: 'adam.testowy@example.com',
      name: 'Adam Testowy',
    });
    expect(email?.body.subject).toContain('osoba dorosła');
    expect(email?.body.textContent).toContain('osoba dorosła zapisuje się sama');
    expect(email?.body.textContent).not.toContain('Rodzic');
  });

  it('rejects an adult signup with the birth date of a minor', async () => {
    const minor = `${new Date(NOW).getUTCFullYear() - 10}-01-01`;
    const { response, body } = await run(
      post({
        signupFor: 'self',
        childName: 'Adam Testowy',
        childBirthDate: minor,
        group: 'Dorośli',
        parentPhone: '600 700 800',
        parentEmail: 'adam.testowy@example.com',
        privacyAcknowledged: true,
        fillTimeMs: 60_000,
        turnstileToken: 'valid-token',
        website: '',
      }),
    );
    expect(response.status).toBe(400);
    expect(
      (body as { fieldErrors?: Record<string, string> }).fieldErrors?.['childBirthDate'],
    ).toMatch(/niepełnoletnią/);
  });

  it('pretends success but sends nothing when the honeypot is filled', async () => {
    const { response, fetchFn } = await run(
      post({ ...validBody, website: 'https://spam.example' }),
    );
    expect(response.status).toBe(200);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('silently drops forms submitted faster than a human could', async () => {
    const { response, fetchFn } = await run(post({ ...validBody, fillTimeMs: 1_000 }));
    expect(response.status).toBe(200);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rejects forms opened more than a day ago', async () => {
    const { response, body } = await run(post({ ...validBody, fillTimeMs: 25 * 3_600_000 }));
    expect(response.status).toBe(400);
    expect(body?.['error']).toBe('expired');
  });

  it('returns Polish field errors for invalid data', async () => {
    const { response, body, fetchFn } = await run(post({ ...validBody, parentEmail: 'nie-email' }));
    expect(response.status).toBe(400);
    expect(body?.['error']).toBe('validation');
    expect(body?.['fieldErrors']).toEqual({ parentEmail: 'Podaj poprawny adres e-mail.' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rejects the signup when Turnstile fails', async () => {
    const fetchFn = makeFetch({ captcha: false });
    const { response, body } = await run(post(validBody), makeEnv(), fetchFn);
    expect(response.status).toBe(400);
    expect(body?.['error']).toBe('captcha');
    expect(brevoCall(fetchFn)).toBeNull();
  });

  it('rejects a missing Turnstile token without calling Cloudflare', async () => {
    const { response, fetchFn } = await run(post({ ...validBody, turnstileToken: '' }));
    expect(response.status).toBe(400);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns 429 when the rate limit is exceeded', async () => {
    const limiter = { limit: vi.fn(async () => ({ success: false })) };
    const env = makeEnv({ SIGNUP_RATE_LIMITER: limiter as unknown as RateLimit });
    const { response, fetchFn } = await run(post(validBody), env);
    expect(response.status).toBe(429);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns 502 when the e-mail cannot be delivered', async () => {
    const { response, body } = await run(
      post(validBody),
      makeEnv(),
      makeFetch({ brevoStatus: 500 }),
    );
    expect(response.status).toBe(502);
    expect(body?.['error']).toBe('delivery');
  });

  it('rejects other content types, invalid JSON and oversized bodies', async () => {
    expect((await run(post('a=b', { 'Content-Type': 'text/plain' }))).response.status).toBe(415);
    expect((await run(post('{not json'))).response.status).toBe(400);
    expect((await run(post('x'.repeat(20_000)))).response.status).toBe(413);
  });
});

describe('signup e-mail', () => {
  it('escapes HTML in user-provided values', () => {
    const email = buildSignupEmail(
      { ...validBody, group: '<script>alert(1)</script>' },
      new Date(NOW),
    );
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('formats the submission time in Polish (Warsaw time)', () => {
    expect(buildSignupEmail(validBody, new Date(NOW)).text).toContain('7 listopada 2026');
  });

  it('adds the optional note with its line breaks, escaped', () => {
    const notes = ['Pytanie o <b>grupę</b>', 'Druga linia'].join(String.fromCharCode(13, 10));
    const email = buildSignupEmail({ ...validBody, notes }, new Date(NOW));
    expect(email.text).toContain('Dodatkowe informacje: Pytanie o <b>grupę</b>\nDruga linia');
    expect(email.html).toContain('Pytanie o &lt;b&gt;grupę&lt;/b&gt;<br>Druga linia');
    expect(email.html).not.toContain('<b>');
  });

  it('leaves the note out when it is empty', () => {
    for (const notes of [undefined, '', '   ']) {
      const email = buildSignupEmail({ ...validBody, notes }, new Date(NOW));
      expect(email.text).not.toContain('Dodatkowe informacje');
    }
  });

  it('escapes all HTML special characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });
});

describe('body size limit', () => {
  it('counts bytes, not characters', async () => {
    // 6,000 characters but 12,000 bytes in UTF-8.
    const { response } = await run(post(JSON.stringify({ pad: 'ł'.repeat(6_000) })));
    expect(response.status).toBe(413);
  });
});

describe('Worker details', () => {
  it('never sends CORS headers on error responses for unknown origins', async () => {
    const { response } = await run(post(validBody, { Origin: 'https://evil.example' }));
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('omits remoteip when Cloudflare did not provide the client IP', async () => {
    const fetchFn = makeFetch();
    await run(post(validBody), makeEnv(), fetchFn);
    const turnstile = fetchFn.mock.calls.find(([input]) => String(input).includes('turnstile'));
    const form = (turnstile as unknown as [unknown, RequestInit])[1].body as URLSearchParams;
    expect(form.has('remoteip')).toBe(false);
  });

  it('rate-limits per client IP', async () => {
    const limiter = { limit: vi.fn(async () => ({ success: true })) };
    const env = makeEnv({ SIGNUP_RATE_LIMITER: limiter as unknown as RateLimit });
    await run(post(validBody, { 'CF-Connecting-IP': '198.51.100.9' }), env);
    expect(limiter.limit).toHaveBeenCalledWith({ key: '198.51.100.9' });
  });

  it('advertises allowed methods on 405', async () => {
    const { response } = await run(
      new Request('https://x.dev/signup', { method: 'PUT', headers: { Origin: ORIGIN } }),
    );
    expect(response.headers.get('Allow')).toBe('POST, OPTIONS');
  });

  it('treats a network error from Turnstile as a failed check', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('network down');
    });
    const { response } = await run(post(validBody), makeEnv(), fetchFn as never);
    expect(response.status).toBe(400);
  });

  it('puts the group in the subject and the parent as Reply-To only', async () => {
    const fetchFn = makeFetch();
    await run(post(validBody), makeEnv(), fetchFn);
    const email = brevoCall(fetchFn);
    expect(email?.body.subject).toBe('Nowe zgłoszenie do klubu (grupa: Dzieci 9–12 lat)');
    expect(email?.body.to).toEqual([{ email: 'club@example.com' }]);
    expect(JSON.stringify(email?.body.to)).not.toContain('anna.testowa');
  });
});
