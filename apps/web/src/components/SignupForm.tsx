/**
 * Club signup form ("Zapisz się do klubu"), hydrated as a React island.
 *
 * Validation runs in the browser with the same schema the Worker uses, so parents get
 * instant Polish error messages. The Worker validates again; its errors are shown the same way.
 * Errors are linked to inputs (aria-invalid / aria-describedby) and focus moves to the first
 * invalid field, the success message or the error alert.
 */
import {
  SIGNUP_FIELDS,
  firstErrorPerField,
  signupFieldsSchema,
  todayIsoDate,
  type SignupField,
  type SignupFieldErrors,
} from '@arawashi/signup-schema';
import { PUBLIC_SIGNUP_ENDPOINT, PUBLIC_TURNSTILE_SITE_KEY } from 'astro:env/client';
import { useEffect, useRef, useState, type SyntheticEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

type Status = 'idle' | 'submitting' | 'success' | 'error';

interface Props {
  /** Training groups to choose from (from the CMS). */
  groups: readonly string[];
  /** Club contact (from the CMS), offered when sending fails. */
  phone?: string | undefined;
  email?: string | undefined;
}

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** Polish messages for the Worker's error codes (\u00a0 keeps one-letter words with the next). */
const SERVER_MESSAGES: Record<string, string> = {
  captcha:
    'Nie udało się potwierdzić, że nie jesteś robotem. Odśwież stronę i\u00a0spróbuj ponownie.',
  expired: 'Formularz był otwarty zbyt długo. Odśwież stronę i\u00a0wypełnij go ponownie.',
  rate_limited: 'Wysłano zbyt wiele zgłoszeń. Spróbuj ponownie za minutę.',
};
const GENERIC_ERROR = 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie za chwilę.';
/** Offered in the group list; preselected while the club has not entered any groups yet. */
const NOT_SURE = 'Nie wiem – pomóżcie wybrać';
/** Shown while no signup endpoint is configured (e.g. the test copy before the Worker exists). */
const NOT_CONNECTED = 'Zgłoszenie nie zostało wysłane, bo formularz nie jest jeszcze podłączony.';

const inputClass =
  'mt-1 block w-full rounded-md border border-ink/60 bg-white px-3 py-2 text-ink focus:border-brand-red focus:outline-2 focus:outline-offset-1 focus:outline-brand-red aria-[invalid=true]:border-brand-red';

interface FieldProps {
  name: SignupField;
  label: string;
  error: string | undefined;
  children: (props: {
    id: string;
    name: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

/** Label + control + error message, wired together for screen readers. */
function Field({ name, label, error, children }: FieldProps) {
  const id = `signup-${name}`;
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="block font-semibold">
        {label}
      </label>
      {children({
        id,
        name,
        'aria-invalid': Boolean(error),
        'aria-describedby': error ? errorId : undefined,
      })}
      {error && (
        <p id={errorId} className="mt-1 text-sm font-medium text-brand-red">
          {error}
        </p>
      )}
    </div>
  );
}

interface CheckboxProps {
  name: SignupField;
  error: string | undefined;
  children: ReactNode;
}

function Checkbox({ name, error, children }: CheckboxProps) {
  const id = `signup-${name}`;
  const errorId = `${id}-error`;
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 size-6 shrink-0 accent-brand-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
        />
        <label htmlFor={id}>{children}</label>
      </div>
      {error && (
        <p id={errorId} className="mt-1 ml-9 text-sm font-medium text-brand-red">
          {error}
        </p>
      )}
    </div>
  );
}

export default function SignupForm({ groups, phone, email }: Props) {
  const [errors, setErrors] = useState<SignupFieldErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileToken = useRef('');
  const turnstileWidget = useRef<string | null>(null);
  // Monotonic clock: unaffected by a wrong device date or time.
  const shownAt = useRef(performance.now());

  // Load the Turnstile widget only when a site key is configured (never in local tests).
  useEffect(() => {
    const container = turnstileRef.current;
    if (!PUBLIC_TURNSTILE_SITE_KEY || !container) return;
    const render = () => {
      if (!window.turnstile || turnstileWidget.current !== null) return;
      turnstileWidget.current = window.turnstile.render(container, {
        sitekey: PUBLIC_TURNSTILE_SITE_KEY ?? '',
        language: 'pl',
        callback: (token) => (turnstileToken.current = token),
        'expired-callback': () => (turnstileToken.current = ''),
        'error-callback': () => (turnstileToken.current = ''),
      });
    };
    if (window.turnstile) {
      render();
      return;
    }
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.addEventListener('load', render);
    document.head.append(script);
  }, []);

  // Move focus to the success message or the error alert when they appear.
  useEffect(() => {
    if (status === 'success' || status === 'error') feedbackRef.current?.focus();
  }, [status]);

  // A field's error disappears as soon as the parent changes that field (validation itself
  // still runs only on submit), so fixed fields stop showing red text and aria-invalid.
  function clearFieldError(event: SyntheticEvent<HTMLFormElement>) {
    const name = (event.target as HTMLInputElement).name as SignupField;
    if (!errors[name]) return;
    setErrors((previous) => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }

  function showFieldErrors(fieldErrors: SignupFieldErrors) {
    // Render the errors before moving focus, so screen readers announce the error text.
    flushSync(() => setErrors(fieldErrors));
    const first = SIGNUP_FIELDS.find((field) => fieldErrors[field]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? '');

    const result = signupFieldsSchema.safeParse({
      childName: text('childName'),
      childBirthDate: text('childBirthDate'),
      group: text('group'),
      parentName: text('parentName'),
      parentPhone: text('parentPhone'),
      parentEmail: text('parentEmail'),
      privacyAcknowledged: data.get('privacyAcknowledged') === 'on',
      guardianConfirmed: data.get('guardianConfirmed') === 'on',
    });
    if (!result.success) {
      setStatus('idle');
      showFieldErrors(firstErrorPerField(result.error));
      return;
    }
    setErrors({});

    if (!PUBLIC_SIGNUP_ENDPOINT) {
      setMessage(NOT_CONNECTED);
      setStatus('error');
      return;
    }

    setStatus('submitting');
    try {
      const response = await fetch(PUBLIC_SIGNUP_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...result.data,
          fillTimeMs: Math.round(performance.now() - shownAt.current),
          turnstileToken: turnstileToken.current,
          website: text('website'),
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      const reply = (typeof body === 'object' && body !== null ? body : {}) as {
        ok?: boolean;
        error?: string;
        fieldErrors?: SignupFieldErrors;
      };

      if (response.ok && reply.ok) {
        setStatus('success');
        return;
      }
      if (
        reply.error === 'validation' &&
        reply.fieldErrors &&
        Object.keys(reply.fieldErrors).length > 0
      ) {
        setStatus('idle');
        showFieldErrors(reply.fieldErrors);
        return;
      }
      setMessage(SERVER_MESSAGES[reply.error ?? ''] ?? GENERIC_ERROR);
      setStatus('error');
    } catch {
      setMessage(GENERIC_ERROR);
      setStatus('error');
    }
    if (turnstileWidget.current !== null) window.turnstile?.reset(turnstileWidget.current);
    turnstileToken.current = '';
  }

  if (status === 'success') {
    return (
      <div
        ref={feedbackRef}
        tabIndex={-1}
        role="status"
        className="rounded-lg border-2 border-green-700 bg-green-50 p-6 text-green-900 focus:outline-none"
      >
        <p className="text-xl font-bold">Dziękujemy! Zgłoszenie zostało wysłane.</p>
        <p className="mt-2">
          Skontaktujemy się z&nbsp;Tobą telefonicznie lub mailowo, żeby umówić pierwszy trening.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      onInput={clearFieldError}
      className="space-y-8"
    >
      {!PUBLIC_SIGNUP_ENDPOINT && (
        <p className="rounded-lg border-l-4 border-brand-blue bg-brand-blue/5 p-4">
          Wysyłanie zgłoszeń przez ten formularz jeszcze nie działa. Możesz go wypełnić, żeby
          zobaczyć, jak wygląda.
        </p>
      )}
      <p className="text-sm text-ink/80">Wszystkie pola są wymagane.</p>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-xl font-bold">Dane dziecka</legend>
        <Field name="childName" label={'Imię i\u00a0nazwisko dziecka'} error={errors.childName}>
          {(props) => (
            <input {...props} type="text" autoComplete="off" required className={inputClass} />
          )}
        </Field>
        <Field name="childBirthDate" label="Data urodzenia dziecka" error={errors.childBirthDate}>
          {(props) => (
            <input {...props} type="date" max={todayIsoDate()} required className={inputClass} />
          )}
        </Field>
        <Field name="group" label="Grupa treningowa" error={errors.group}>
          {(props) => (
            <select
              {...props}
              required
              defaultValue={groups.length > 0 ? '' : NOT_SURE}
              className={inputClass}
            >
              <option value="">Wybierz grupę</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
              <option value={NOT_SURE}>{NOT_SURE}</option>
            </select>
          )}
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-xl font-bold">Dane rodzica lub opiekuna</legend>
        <Field name="parentName" label={'Imię i\u00a0nazwisko'} error={errors.parentName}>
          {(props) => (
            <input {...props} type="text" autoComplete="name" required className={inputClass} />
          )}
        </Field>
        <Field name="parentPhone" label="Telefon" error={errors.parentPhone}>
          {(props) => (
            <input
              {...props}
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required
              className={inputClass}
            />
          )}
        </Field>
        <Field name="parentEmail" label="E-mail" error={errors.parentEmail}>
          {(props) => (
            <input {...props} type="email" autoComplete="email" required className={inputClass} />
          )}
        </Field>
      </fieldset>

      {/* Target of "Wróć do formularza" in the privacy section: lands with the fields above it in
          view and a ring that shows where the reader is, even when the page cannot scroll. */}
      <div
        id="oswiadczenia"
        className="scroll-mt-32 space-y-4 rounded-md target:ring-2 target:ring-brand-blue target:ring-offset-8"
      >
        <Checkbox name="privacyAcknowledged" error={errors.privacyAcknowledged}>
          Zapoznałem/am się z&nbsp;
          <a
            href="#informacja-rodo"
            className="rounded font-semibold text-brand-red underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red"
          >
            informacją o&nbsp;przetwarzaniu danych osobowych
          </a>
          .
        </Checkbox>
        <Checkbox name="guardianConfirmed" error={errors.guardianConfirmed}>
          Jestem rodzicem lub opiekunem prawnym dziecka.
        </Checkbox>
      </div>

      {/* Honeypot: hidden from people and assistive technology; bots tend to fill it in. */}
      <div hidden>
        <label>
          Strona internetowa
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div ref={turnstileRef} />

      {status === 'error' && (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border-2 border-brand-red bg-red-50 p-4 text-ink focus:outline-none"
        >
          {message}
          {(phone || email) && (
            <span className="mt-2 block">
              Możesz też skontaktować się z&nbsp;nami:{' '}
              {phone && (
                <>
                  tel.{' '}
                  <a
                    href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                    className="rounded font-semibold text-brand-red underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red"
                  >
                    {phone}
                  </a>
                </>
              )}
              {phone && email && ' · '}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="rounded font-semibold wrap-anywhere text-brand-red underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red"
                >
                  {email}
                </a>
              )}
            </span>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-md bg-brand-red px-6 py-3 text-lg font-semibold text-white hover:bg-brand-red-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red disabled:cursor-wait disabled:bg-brand-red-dark forced-colors:border-2"
      >
        {status === 'submitting' ? 'Wysyłanie…' : 'Wyślij zgłoszenie'}
      </button>
    </form>
  );
}
