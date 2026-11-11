import { describe, expect, it } from 'vitest';
import {
  SIGNUP_FIELDS,
  firstErrorPerField,
  pl,
  signupFieldsSchema,
  signupRequestSchema,
  todayIsoDate,
  type SignupFields,
} from './index';

/** Synthetic test data only – never use real people's details in tests. */
const valid: SignupFields = {
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

  it('reports one message per field for an empty form', () => {
    const errors = errorsFor({});
    expect(Object.keys(errors).sort()).toEqual([...SIGNUP_FIELDS].sort());
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
