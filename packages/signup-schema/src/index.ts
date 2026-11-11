/**
 * Validation rules for the "Zapisz się do klubu" (club signup) form.
 *
 * The same schema runs in the browser (instant feedback) and in the signup Worker
 * (the only check that can be trusted). Error messages are in Polish because they are
 * shown to parents as-is.
 *
 * Only the fields from the club's brief are collected. There is no free-text field
 * (names, phone and e-mail have strict formats; the group is a short single line), so health
 * or other special-category data (GDPR art. 9) is unlikely to arrive by accident.
 */
import { z } from 'zod';

// No JIT-compiled validators: Zod would otherwise probe `new Function()`, which the site's
// Content Security Policy blocks (and Cloudflare Workers do not allow eval either).
z.config({ jitless: true });

/** Forms filled in faster than this are treated as bots (measured in the browser). */
export const MIN_FILL_TIME_MS = 3_000;

/** Forms open longer than this are rejected (stale page or replayed request). */
export const MAX_FILL_TIME_MS = 24 * 60 * 60 * 1000;

/** Letters (including Polish diacritics), spaces, apostrophes, dots and hyphens. */
const NAME_PATTERN = /^\p{L}[\p{L}\p{M}' .’-]*$/u;

/** Digits, spaces, brackets, hyphens and an optional leading plus sign, e.g. "(+48) 600 700 800". */
const PHONE_PATTERN = /^\(?\+?[\d ()-]+$/;

/** No control characters (line breaks, tabs…): values end up in e-mail subjects and bodies. */
const SINGLE_LINE = /^[^\p{Cc}]*$/u;

/**
 * Polish typesetting for the messages: a non-breaking space after one-letter words
 * (a, i, o, u, w, z), so a message never ends a line with "i" or "z".
 */
const NBSP = String.fromCharCode(0xa0);
export const pl = (text: string) => text.replace(/(?<=^|\s)([aiouwzAIOUWZ]) /g, `$1${NBSP}`);

/** Today's date as YYYY-MM-DD (UTC), comparable with ISO date strings. */
export function todayIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** A first name and a surname: at least two words. */
function personName(missingMessage: string) {
  return z
    .string()
    .trim()
    .min(1, { error: pl(missingMessage) })
    .max(100, { error: 'Maksymalnie 100 znaków.' })
    .regex(NAME_PATTERN, { error: 'Użyj tylko liter, spacji, myślnika lub apostrofu.' })
    .refine((value) => value.split(/ +/).length >= 2, { error: pl('Podaj imię i nazwisko.') });
}

export const signupFieldsSchema = z.object({
  childName: personName('Podaj imię i nazwisko dziecka.'),
  childBirthDate: z.iso
    .date({ error: 'Podaj datę urodzenia dziecka.' })
    .refine((value) => value >= '1900-01-01', { error: 'Sprawdź rok urodzenia.' })
    .refine((value) => value <= todayIsoDate(), {
      error: pl('Data urodzenia nie może być z przyszłości.'),
    }),
  group: z
    .string()
    .trim()
    .min(1, { error: 'Wybierz grupę.' })
    .max(100, { error: 'Maksymalnie 100 znaków.' })
    .regex(SINGLE_LINE, { error: 'Wybierz grupę z listy.' }),
  parentName: personName('Podaj imię i nazwisko rodzica lub opiekuna.'),
  parentPhone: z
    .string()
    .trim()
    .min(1, { error: 'Podaj numer telefonu.' })
    .max(30, { error: 'Numer telefonu jest za długi.' })
    .regex(PHONE_PATTERN, {
      error: pl('Numer może zawierać tylko cyfry, spacje, nawiasy, myślniki i znak +.'),
    })
    .refine(
      (value) => {
        const digits = value.replace(/\D/g, '').length;
        return digits >= 9 && digits <= 15;
      },
      { error: 'Numer telefonu powinien mieć od 9 do 15 cyfr.' },
    ),
  parentEmail: z
    .string()
    .trim()
    .min(1, { error: 'Podaj adres e-mail.' })
    .max(254, { error: 'Adres e-mail jest za długi.' })
    .pipe(z.email({ error: 'Podaj poprawny adres e-mail.' })),
  privacyAcknowledged: z.literal(true, {
    error: pl('Potwierdź zapoznanie się z informacją o przetwarzaniu danych.'),
  }),
  guardianConfirmed: z.literal(true, {
    error: 'Potwierdź, że jesteś rodzicem lub opiekunem prawnym dziecka.',
  }),
});

export type SignupFields = z.infer<typeof signupFieldsSchema>;
export type SignupField = keyof SignupFields;

/** Form fields in display order (used to focus the first invalid field). */
export const SIGNUP_FIELDS = Object.keys(signupFieldsSchema.shape) as SignupField[];

/**
 * The full request body sent to the Worker: the form fields plus anti-bot metadata.
 * `fillTimeMs` is measured in the browser with a monotonic clock (performance.now), so a wrong
 * device clock cannot make a real signup look like a bot. `website` is a honeypot that real
 * users never see or fill in.
 */
export const signupRequestSchema = signupFieldsSchema.extend({
  fillTimeMs: z.number().int().nonnegative(),
  turnstileToken: z.string().max(4096),
  website: z.string().max(200).optional(),
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;

/** Field name → first error message, ready to show next to each input. */
export type SignupFieldErrors = Partial<Record<SignupField, string>>;

/** Keeps the first error message for every top-level form field. */
export function firstErrorPerField(error: z.ZodError): SignupFieldErrors {
  const result: SignupFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && field in signupFieldsSchema.shape) {
      const key = field as SignupField;
      result[key] ??= issue.message;
    }
  }
  return result;
}
