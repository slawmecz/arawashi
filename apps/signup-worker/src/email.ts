import type { SignupRequest } from '@arawashi/signup-schema';

/** Escapes text for safe use inside HTML. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface SignupEmail {
  subject: string;
  text: string;
  html: string;
}

/**
 * Builds the e-mail sent to the club (in Polish), for a child signed up by a parent or an adult
 * signing up themselves. The contact address is used as Reply-To, so the club can answer
 * directly from its inbox.
 */
export function buildSignupEmail(data: SignupRequest, sentAt: Date): SignupEmail {
  const when = new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Warsaw',
  }).format(sentAt);

  const adult = data.signupFor === 'self';
  const rows: [string, string][] = adult
    ? [
        ['Zapis', 'osoba dorosła zapisuje się sama'],
        ['Imię i nazwisko', data.childName],
        ['Data urodzenia', data.childBirthDate],
        ['Grupa', data.group],
        ['Telefon', data.parentPhone],
        ['E-mail', data.parentEmail],
        ['Zapoznanie z informacją o danych osobowych', 'tak'],
        ['Wysłano', when],
      ]
    : [
        ['Dziecko', data.childName],
        ['Data urodzenia', data.childBirthDate],
        ['Grupa', data.group],
        ['Rodzic / opiekun', data.parentName],
        ['Telefon', data.parentPhone],
        ['E-mail', data.parentEmail],
        ['Zapoznanie z informacją o danych osobowych', 'tak'],
        ['Oświadczenie rodzica / opiekuna prawnego', 'tak'],
        ['Wysłano', when],
      ];

  const footer =
    `Odpowiedz na tę wiadomość, aby napisać do ${adult ? 'tej osoby' : 'rodzica'}. ` +
    'Usuń zgłoszenie, gdy nie będzie już potrzebne (zgodnie z polityką prywatności klubu).';

  const text = [
    'Nowe zgłoszenie z formularza „Zapisz się do klubu” na stronie arawashi.eu',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    footer,
  ].join('\n');

  const html = `<!doctype html><html lang="pl"><body style="font-family:Arial,sans-serif;color:#111">
<p>Nowe zgłoszenie z formularza <strong>„Zapisz się do klubu”</strong> na stronie arawashi.eu</p>
<table cellpadding="6" style="border-collapse:collapse">
${rows
  .map(
    ([label, value]) =>
      `<tr><th align="left" style="border-bottom:1px solid #ddd">${escapeHtml(label)}</th><td style="border-bottom:1px solid #ddd">${escapeHtml(value)}</td></tr>`,
  )
  .join('\n')}
</table>
<p style="color:#555">${escapeHtml(footer)}</p>
</body></html>`;

  const who = adult ? 'osoba dorosła, ' : '';
  return { subject: `Nowe zgłoszenie do klubu (${who}grupa: ${data.group})`, text, html };
}
