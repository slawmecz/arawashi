import { describe, expect, it } from 'vitest';
import {
  NOTES_MAX_LENGTH,
  SIGNUP_FIELDS,
  firstErrorPerField,
  isAdult,
  pl,
  signupFieldsSchema,
  signupRequestSchema,
  todayIsoDate,
  type SignupFields,
} from './index';

/** Synthetic test data only – never use real people's details in tests. */
const valid: SignupFields = {
  signupFor: 'child',
  childName: 'Jan Testowy',
  childBirthDate: '2016-05-20',
  group: 'Dzieci 9–12 lat',
  parentName: 'Anna Testowa',
  parentPhone: '+48 600 700 800',
  parentEmail: 'anna.testowa@example.com',
  privacyAcknowledged: true,
  guardianConfirmed: true,
};

function errorsFor(input: Record<string, unknown>) {
  const result = signupFieldsSchema.safeParse(input);
  if (result.success) throw new Error('expected validation to fail');
  return firstErrorPerField(result.error);
}

describe('signupFieldsSchema', () => {
  it('never ends a message line with a one-letter word (non-breaking spaces)', () => {
    const invalid = [
      { ...valid, childName: '', parentName: 'Jan', parentPhone: 'abc', parentEmail: 'x' },
      { ...valid, childName: 'Jan', childBirthDate: '2999-01-01', parentPhone: '12' },
      { ...valid, privacyAcknowledged: false, guardianConfirmed: false, group: '' },
      { signupFor: 'self', childName: '', childBirthDate: '2015-01-01', parentPhone: 'x' },
    ];
    const messages = invalid.flatMap((input) => Object.values(errorsFor(input)));
    expect(messages.length).toBeGreaterThan(8);
    for (const message of messages) expect(message).not.toMatch(/(?<=^|\s)[aiouwzAIOUWZ] /);
  });

  it('accepts a complete, valid form', () => {
    expect(signupFieldsSchema.safeParse(valid).success).toBe(true);
  });

  it('trims whitespace around text fields', () => {
    const result = signupFieldsSchema.parse({ ...valid, parentEmail: '  anna@example.com ' });
    expect(result.parentEmail).toBe('anna@example.com');
  });

  it('accepts Polish diacritics and double-barrelled surnames', () => {
    expect(
      signupFieldsSchema.safeParse({ ...valid, childName: 'Łucja Żółkiewska-Dąbrowska' }).success,
    ).toBe(true);
  });

  it('requires a first name and a surname', () => {
    expect(errorsFor({ ...valid, childName: 'Jan' }).childName).toBe(pl('Podaj imię i nazwisko.'));
  });

  it('rejects names with digits or symbols', () => {
    expect(errorsFor({ ...valid, parentName: 'Anna <b>Test</b>' }).parentName).toBeDefined();
  });

  it('rejects a birth date in the future', () => {
    const nextYear = `${new Date().getUTCFullYear() + 1}-01-01`;
    expect(errorsFor({ ...valid, childBirthDate: nextYear }).childBirthDate).toBe(
      pl('Data urodzenia nie może być z przyszłości.'),
    );
  });

  it('rejects a malformed birth date', () => {
    expect(errorsFor({ ...valid, childBirthDate: '20.05.2016' }).childBirthDate).toBeDefined();
  });

  it.each(['600700800', '+48 600-700-800', '(+48) 600 700 800', '0048600700800'])(
    'accepts the phone number %s',
    (parentPhone) => {
      expect(signupFieldsSchema.safeParse({ ...valid, parentPhone }).success).toBe(true);
    },
  );

  it.each(['12345', 'abc', '600 700 800 ext. 5'])('rejects the phone number %s', (parentPhone) => {
    expect(errorsFor({ ...valid, parentPhone }).parentPhone).toBeDefined();
  });

  it('rejects an invalid e-mail address', () => {
    expect(errorsFor({ ...valid, parentEmail: 'anna@' }).parentEmail).toBe(
      'Podaj poprawny adres e-mail.',
    );
  });

  it('requires both declarations', () => {
    const errors = errorsFor({ ...valid, privacyAcknowledged: false, guardianConfirmed: false });
    expect(errors.privacyAcknowledged).toBeDefined();
    expect(errors.guardianConfirmed).toBeDefined();
  });

  it('asks who is signed up when the choice is missing', () => {
    expect(errorsFor({}).signupFor).toBe('Wybierz, kogo zapisujesz.');
  });

  it('reports one message per required field for an empty child form', () => {
    const errors = errorsFor({ signupFor: 'child' });
    // "notes" is optional, so an empty form has no message for it.
    expect(Object.keys(errors).sort()).toEqual(
      SIGNUP_FIELDS.filter((field) => field !== 'signupFor' && field !== 'notes').sort(),
    );
  });
});

/** Synthetic adult signing up themselves. */
const adult: SignupFields = {
  signupFor: 'self',
  childName: 'Adam Testowy',
  childBirthDate: '1990-03-15',
  group: 'Dorośli',
  parentPhone: '600 700 800',
  parentEmail: 'adam.testowy@example.com',
  privacyAcknowledged: true,
};

describe('adult signup (signupFor: "self")', () => {
  it('accepts an adult without any parent or guardian fields', () => {
    expect(signupFieldsSchema.safeParse(adult).success).toBe(true);
  });

  it('reports one message per field for an empty adult form', () => {
    // What the form sends when nothing is filled in: empty strings and an unticked checkbox.
    const errors = errorsFor({
      signupFor: 'self',
      childName: '',
      childBirthDate: '',
      group: '',
      parentPhone: '',
      parentEmail: '',
      privacyAcknowledged: false,
    });
    expect(Object.keys(errors).sort()).toEqual([
      'childBirthDate',
      'childName',
      'group',
      'parentEmail',
      'parentPhone',
      'privacyAcknowledged',
    ]);
    expect(errors.childName).toBe(pl('Podaj imię i nazwisko.'));
  });

  it('sends minors to the child form', () => {
    const minor = `${new Date().getUTCFullYear() - 10}-01-01`;
    expect(errorsFor({ ...adult, childBirthDate: minor }).childBirthDate).toBe(
      pl('Osobę niepełnoletnią zapisuje rodzic lub opiekun – wybierz „Dziecko”.'),
    );
  });

  it('counts the 18th birthday as adult', () => {
    expect(isAdult('2008-11-14', '2026-11-14')).toBe(true);
    expect(isAdult('2008-11-15', '2026-11-14')).toBe(false);
  });

  it('accepts an adult request with the anti-bot metadata', () => {
    const request = { ...adult, fillTimeMs: 15_000, turnstileToken: 'token', website: '' };
    expect(signupRequestSchema.safeParse(request).success).toBe(true);
  });
});

describe('signupRequestSchema', () => {
  it('accepts the form fields with anti-bot metadata', () => {
    const request = { ...valid, fillTimeMs: 15_000, turnstileToken: 'token', website: '' };
    expect(signupRequestSchema.safeParse(request).success).toBe(true);
  });

  it('requires the measured fill time', () => {
    expect(signupRequestSchema.safeParse({ ...valid, turnstileToken: '' }).success).toBe(false);
  });
});

describe('todayIsoDate', () => {
  it('formats a date as YYYY-MM-DD in UTC', () => {
    expect(todayIsoDate(new Date('2026-11-07T23:30:00Z'))).toBe('2026-11-07');
  });
});

describe('control characters', () => {
  it('rejects line breaks in the group and the phone number', () => {
    const errors = errorsFor({
      ...valid,
      group: 'A\r\nBcc: x@example.com',
      parentPhone: '600\n700800',
    });
    expect(errors.group).toBeDefined();
    expect(errors.parentPhone).toBeDefined();
  });
});

describe('boundaries', () => {
  it('accepts 9 and 15 digit phone numbers but not 8 or 16', () => {
    expect(signupFieldsSchema.safeParse({ ...valid, parentPhone: '600700800' }).success).toBe(true);
    expect(signupFieldsSchema.safeParse({ ...valid, parentPhone: '123456789012345' }).success).toBe(
      true,
    );
    expect(errorsFor({ ...valid, parentPhone: '60070080' }).parentPhone).toBeDefined();
    expect(errorsFor({ ...valid, parentPhone: '1234567890123456' }).parentPhone).toBeDefined();
  });

  it('limits names to 100 characters', () => {
    const name = (length: number) => `Jan ${'a'.repeat(length - 4)}`;
    expect(signupFieldsSchema.safeParse({ ...valid, childName: name(100) }).success).toBe(true);
    expect(errorsFor({ ...valid, childName: name(101) }).childName).toBe('Maksymalnie 100 znaków.');
  });

  it('accepts a birth date of today but not before 1900', () => {
    expect(signupFieldsSchema.safeParse({ ...valid, childBirthDate: todayIsoDate() }).success).toBe(
      true,
    );
    expect(errorsFor({ ...valid, childBirthDate: '1899-12-31' }).childBirthDate).toBe(
      'Sprawdź rok urodzenia.',
    );
  });

  it('rejects impossible calendar dates', () => {
    expect(errorsFor({ ...valid, childBirthDate: '2016-02-30' }).childBirthDate).toBeDefined();
  });

  it('rejects a negative fill time', () => {
    const request = { ...valid, fillTimeMs: -1, turnstileToken: '', website: '' };
    expect(signupRequestSchema.safeParse(request).success).toBe(false);
  });
});

describe('notes ("Dodatkowe informacje")', () => {
  it('is optional: no note, an empty note and spaces only are all fine', () => {
    expect(signupFieldsSchema.safeParse(valid).success).toBe(true);
    expect(signupFieldsSchema.safeParse({ ...valid, notes: '' }).success).toBe(true);
    expect(signupFieldsSchema.parse({ ...valid, notes: '   ' }).notes).toBe('');
  });

  it('keeps line breaks and trims the ends', () => {
    const note = ['  Pytanie o grupę.', 'Dziękuję!  '].join(String.fromCharCode(13, 10));
    const parsed = signupFieldsSchema.parse({ ...valid, notes: note });
    expect(parsed.notes).toBe(note.trim());
    expect(parsed.notes).toContain(String.fromCharCode(13, 10));
  });

  it(`accepts ${NOTES_MAX_LENGTH} characters but not more`, () => {
    expect(
      signupFieldsSchema.safeParse({ ...valid, notes: 'a'.repeat(NOTES_MAX_LENGTH) }).success,
    ).toBe(true);
    expect(errorsFor({ ...valid, notes: 'a'.repeat(NOTES_MAX_LENGTH + 1) }).notes).toBe(
      `Maksymalnie ${NOTES_MAX_LENGTH} znaków.`,
    );
  });

  it('rejects control characters other than line breaks', () => {
    expect(errorsFor({ ...valid, notes: `a${String.fromCharCode(0)}b` }).notes).toBe(
      pl('Usuń znaki specjalne z dodatkowych informacji.'),
    );
    expect(errorsFor({ ...valid, notes: `a${String.fromCharCode(7)}b` }).notes).toBeDefined();
  });

  it('works for an adult signing up themselves too', () => {
    expect(signupFieldsSchema.parse({ ...adult, notes: 'Trenowałem kiedyś judo.' }).notes).toBe(
      'Trenowałem kiedyś judo.',
    );
  });

  it('is listed among the form fields, after the contact data', () => {
    expect(SIGNUP_FIELDS.indexOf('notes')).toBe(SIGNUP_FIELDS.indexOf('parentEmail') + 1);
  });
});
