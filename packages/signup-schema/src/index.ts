/**
 * Validation rules for the "Zapisz się do klubu" (club signup) form.
 *
 * The same schema runs in the browser (instant feedback) and in the signup Worker
 * (the only check that can be trusted). Error messages are in Polish because they are
 * shown to parents as-is.
 *
 * Two variants share one request shape (field `signupFor`): a parent signs up a child
 * ("child"), or an adult signs up themselves ("self", 18+ only).
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

/** A date of birth: a real date, not in the future and not before 1900. */
function birthDate(missingMessage: string) {
  return z.iso
    .date({ error: missingMessage })
    .refine((value) => value >= '1900-01-01', { error: 'Sprawdź rok urodzenia.' })
    .refine((value) => value <= todayIsoDate(), {
      error: pl('Data urodzenia nie może być z przyszłości.'),
    });
}

/** True when someone born on `isoDate` (YYYY-MM-DD) is at least 18 years old on `today`. */
export function isAdult(isoDate: string, today: string = todayIsoDate()): boolean {
  const [year, month, day] = today.split('-');
  return isoDate <= `${Number(year) - 18}-${month}-${day}`;
}

const group = z
  .string()
  .trim()
  .min(1, { error: 'Wybierz grupę.' })
  .max(100, { error: 'Maksymalnie 100 znaków.' })
  .regex(SINGLE_LINE, { error: 'Wybierz grupę z listy.' });

const phone = z
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
  );

const email = z
  .string()
  .trim()
  .min(1, { error: 'Podaj adres e-mail.' })
  .max(254, { error: 'Adres e-mail jest za długi.' })
  .pipe(z.email({ error: 'Podaj poprawny adres e-mail.' }));

const privacyAcknowledged = z.literal(true, {
  error: pl('Potwierdź zapoznanie się z informacją o przetwarzaniu danych.'),
});

/** A parent or guardian signs up a child (the form from the club's brief). */
const childSignupSchema = z.object({
  signupFor: z.literal('child'),
  childName: personName('Podaj imię i nazwisko dziecka.'),
  childBirthDate: birthDate('Podaj datę urodzenia dziecka.'),
  group,
  parentName: personName('Podaj imię i nazwisko rodzica lub opiekuna.'),
  parentPhone: phone,
  parentEmail: email,
  privacyAcknowledged,
  guardianConfirmed: z.literal(true, {
    error: 'Potwierdź, że jesteś rodzicem lub opiekunem prawnym dziecka.',
  }),
});

/**
 * An adult signs up themselves. To keep one request shape, the trainee fields keep their names
 * (childName, childBirthDate hold the adult's own data) and parentPhone / parentEmail hold the
 * adult's own contact. A minor cannot use this path: a parent or guardian signs them up.
 */
const adultSignupSchema = z.object({
  signupFor: z.literal('self'),
  childName: personName('Podaj imię i nazwisko.'),
  childBirthDate: birthDate('Podaj datę urodzenia.').refine((value) => isAdult(value), {
    error: pl('Osobę niepełnoletnią zapisuje rodzic lub opiekun – wybierz „Dziecko”.'),
  }),
  group,
  parentPhone: phone,
  parentEmail: email,
  privacyAcknowledged,
});

const WHO = { error: 'Wybierz, kogo zapisujesz.' };

export const signupFieldsSchema = z.discriminatedUnion(
  'signupFor',
  [childSignupSchema, adultSignupSchema],
  WHO,
);

export type SignupFields = z.infer<typeof signupFieldsSchema>;

/** Every form field in display order (used to focus the first invalid field). */
export const SIGNUP_FIELDS = [
  'signupFor',
  'childName',
  'childBirthDate',
  'group',
  'parentName',
  'parentPhone',
  'parentEmail',
  'privacyAcknowledged',
  'guardianConfirmed',
] as const;

export type SignupField = (typeof SIGNUP_FIELDS)[number];

/**
 * The full request body sent to the Worker: the form fields plus anti-bot metadata.
 * `fillTimeMs` is measured in the browser with a monotonic clock (performance.now), so a wrong
 * device clock cannot make a real signup look like a bot. `website` is a honeypot that real
 * users never see or fill in.
 */
const requestMeta = {
  fillTimeMs: z.number().int().nonnegative(),
  turnstileToken: z.string().max(4096),
  website: z.string().max(200).optional(),
};

export const signupRequestSchema = z.discriminatedUnion(
  'signupFor',
  [childSignupSchema.extend(requestMeta), adultSignupSchema.extend(requestMeta)],
  WHO,
);

export type SignupRequest = z.infer<typeof signupRequestSchema>;

/** Field name → first error message, ready to show next to each input. */
export type SignupFieldErrors = Partial<Record<SignupField, string>>;

const FIELD_NAMES: ReadonlySet<string> = new Set(SIGNUP_FIELDS);

/** Keeps the first error message for every top-level form field. */
export function firstErrorPerField(error: z.ZodError): SignupFieldErrors {
  const result: SignupFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && FIELD_NAMES.has(field)) {
      result[field as SignupField] ??= issue.message;
    }
  }
  return result;
}
