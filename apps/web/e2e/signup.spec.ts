import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Must match TEST_SIGNUP_ENDPOINT in playwright.config.ts. */
const ENDPOINT = 'https://signup.test/signup';

/** Synthetic test data only. */
async function fillValidForm(page: Page) {
  await page.getByLabel('Imię i nazwisko dziecka').fill('Jan Testowy');
  await page.getByLabel('Data urodzenia dziecka').fill('2016-05-20');
  await page.getByLabel('Grupa treningowa').selectOption('Grupa testowa A');
  await page.getByLabel('Imię i nazwisko', { exact: true }).fill('Anna Testowa');
  await page.getByLabel('Telefon').fill('+48 600 700 800');
  await page.getByLabel('E-mail').fill('anna.testowa@example.com');
  await page.getByLabel(/Zapoznałem\/am się/).check();
  await page.getByLabel(/Jestem rodzicem lub opiekunem/).check();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/zapisz-sie/');
  // Wait for the React island to hydrate before interacting.
  await page.waitForLoadState('networkidle');
});

test('shows Polish errors and focuses the first invalid field', async ({ page }) => {
  await page.getByRole('button', { name: 'Wyślij zgłoszenie' }).click();

  const childName = page.getByLabel('Imię i nazwisko dziecka');
  await expect(childName).toBeFocused();
  await expect(childName).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Podaj imię i nazwisko dziecka.')).toBeVisible();
  await expect(
    page.getByText('Podaj poprawny adres e-mail.').or(page.getByText('Podaj adres e-mail.')),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('sends a valid form and shows the confirmation', async ({ page }) => {
  let sent: Record<string, unknown> | undefined;
  await page.route(ENDPOINT, async (route) => {
    sent = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ json: { ok: true } });
  });

  await fillValidForm(page);
  await page.getByRole('button', { name: 'Wyślij zgłoszenie' }).click();

  await expect(page.getByRole('status')).toContainText('Dziękujemy! Zgłoszenie zostało wysłane.');
  expect(sent).toMatchObject({
    signupFor: 'child',
    childName: 'Jan Testowy',
    group: 'Grupa testowa A',
    parentEmail: 'anna.testowa@example.com',
    privacyAcknowledged: true,
    guardianConfirmed: true,
    website: '',
  });
  expect(typeof sent?.['fillTimeMs']).toBe('number');
});

test('an adult can sign up themselves, without the parent fields', async ({ page }) => {
  let sent: Record<string, unknown> | undefined;
  await page.route(ENDPOINT, async (route) => {
    sent = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ json: { ok: true } });
  });

  await page.getByLabel('Siebie (osoba dorosła)').check();
  await expect(page.getByText('Dane rodzica lub opiekuna')).toHaveCount(0);
  await expect(page.getByLabel(/Jestem rodzicem lub opiekunem/)).toHaveCount(0);

  await page.getByLabel('Imię i nazwisko', { exact: true }).fill('Adam Testowy');
  await page.getByLabel('Data urodzenia', { exact: true }).fill('1990-03-15');
  await page.getByLabel('Grupa treningowa').selectOption('Grupa testowa B');
  await page.getByLabel('Telefon').fill('600 700 800');
  await page.getByLabel('E-mail').fill('adam.testowy@example.com');
  await page.getByLabel(/Zapoznałem\/am się/).check();
  await page.getByRole('button', { name: 'Wyślij zgłoszenie' }).click();

  await expect(page.getByRole('status')).toContainText('Dziękujemy! Zgłoszenie zostało wysłane.');
  expect(sent).toMatchObject({
    signupFor: 'self',
    childName: 'Adam Testowy',
    parentEmail: 'adam.testowy@example.com',
  });
  expect(sent).not.toHaveProperty('parentName');
  expect(sent).not.toHaveProperty('guardianConfirmed');
});

test('the adult option sends minors back to the child form', async ({ page }) => {
  await page.getByLabel('Siebie (osoba dorosła)').check();
  await page.getByLabel('Data urodzenia', { exact: true }).fill('2016-05-20');
  await page.getByRole('button', { name: 'Wyślij zgłoszenie' }).click();
  await expect(page.getByText(/Osobę niepełnoletnią zapisuje rodzic lub opiekun/)).toBeVisible();
});

test('shows field errors returned by the server', async ({ page }) => {
  await page.route(ENDPOINT, (route) =>
    route.fulfill({
      status: 400,
      json: { ok: false, error: 'validation', fieldErrors: { parentPhone: 'Błąd z serwera.' } },
    }),
  );
  await fillValidForm(page);
  await page.getByRole('button', { name: 'Wyślij zgłoszenie' }).click();

  await expect(page.getByText('Błąd z serwera.')).toBeVisible();
  await expect(page.getByLabel('Telefon')).toBeFocused();
});

test('shows an alert when the server is unavailable', async ({ page }) => {
  await page.route(ENDPOINT, (route) =>
    route.fulfill({ status: 502, json: { ok: false, error: 'delivery' } }),
  );
  await fillValidForm(page);
  await page.getByRole('button', { name: 'Wyślij zgłoszenie' }).click();

  await expect(page.getByRole('alert')).toContainText('Nie udało się wysłać zgłoszenia');
  await expect(page.getByRole('alert')).toBeFocused();
});

test('a corrected field loses its error message', async ({ page }) => {
  await page.getByRole('button', { name: 'Wyślij zgłoszenie' }).click();
  const childName = page.getByLabel('Imię i nazwisko dziecka');
  await expect(childName).toHaveAttribute('aria-invalid', 'true');
  await childName.fill('Jan Testowy');
  await expect(childName).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByText('Podaj imię i nazwisko dziecka.')).toHaveCount(0);
  // Other fields keep their errors until they are corrected.
  await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true');
});

test('when sending fails, the alert offers the club phone and e-mail', async ({ page }) => {
  await page.route(ENDPOINT, (route) => route.fulfill({ status: 500 }));
  await fillValidForm(page);
  await page.getByRole('button', { name: 'Wyślij zgłoszenie' }).click();

  const alert = page.getByRole('alert');
  await expect(alert.getByRole('link', { name: '+48 000 000 000' })).toHaveAttribute(
    'href',
    'tel:+48000000000',
  );
  await expect(alert.getByRole('link', { name: 'kontakt@example.com' })).toBeVisible();
});
