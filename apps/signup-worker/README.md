# Signup Worker

Cloudflare Worker behind the "Zapisz się do klubu" form. For each submission it:

1. checks the request origin (CORS allow-list) and applies a per-IP rate limit (5 requests/min);
2. drops bots: a honeypot field, a minimum fill time of 3 s, and a Cloudflare Turnstile check;
3. validates the payload with the shared schema (`@arawashi/signup-schema`);
4. sends one e-mail to the club inbox through the Brevo API, with `Reply-To` set to the parent.

It stores nothing, and request logging is disabled (`observability.enabled: false`).
Architecture decision: [`docs/decisions/0004`](../../docs/decisions/0004-signup-form-on-a-worker.md).

## API

| Method & path     | Response                                                                                |
| ----------------- | --------------------------------------------------------------------------------------- |
| `GET /health`     | `200 { "ok": true }`                                                                    |
| `OPTIONS /signup` | CORS preflight (`204` for allowed origins, `403` otherwise)                             |
| `POST /signup`    | `200 { ok: true }` or `{ ok: false, error, fieldErrors? }` with 400/403/413/415/429/502 |

Error codes: `validation` (with Polish `fieldErrors`), `captcha`, `expired`, `rate_limited`,
`forbidden_origin`, `unsupported_media_type`, `payload_too_large`, `invalid_json`, `delivery`.

## Configuration

| Name                   | Kind    | Notes                                                    |
| ---------------------- | ------- | -------------------------------------------------------- |
| `ALLOWED_ORIGINS`      | var     | Comma-separated origins, in `wrangler.jsonc`             |
| `MAIL_FROM`            | var     | Sender address; the domain must be verified in Brevo     |
| `MAIL_FROM_NAME`       | var     | Sender display name                                      |
| `MAIL_TO`              | secret  | Club inbox (kept out of the public repository)           |
| `BREVO_API_KEY`        | secret  | Brevo → SMTP & API → API keys                            |
| `TURNSTILE_SECRET_KEY` | secret  | Cloudflare dashboard → Turnstile → the site's secret key |
| `SIGNUP_RATE_LIMITER`  | binding | Workers Rate Limiting, in `wrangler.jsonc`               |

## Deploy

```sh
pnpm exec wrangler login
pnpm exec wrangler secret put MAIL_TO
pnpm exec wrangler secret put BREVO_API_KEY
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
pnpm deploy            # prints the URL, e.g. https://arawashi-signup.<account>.workers.dev
```

Then set `PUBLIC_SIGNUP_ENDPOINT=<worker URL>/signup` and `PUBLIC_TURNSTILE_SITE_KEY` for the
website build (GitHub repository → Settings → Secrets and variables → Actions → Variables).

## Local development

```sh
cp .dev.vars.example .dev.vars   # test Turnstile secret, localhost origin
pnpm dev                         # http://localhost:8787
pnpm test                        # unit tests (no Workers runtime needed)
```
