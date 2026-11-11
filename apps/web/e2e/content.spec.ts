import { expect, test } from '@playwright/test';

/** Pages rendered from the synthetic fixture content (CONTENT_SOURCE=fixtures). */

test('training page lists groups and filters the schedule by group', async ({ page, isMobile }) => {
  await page.goto('/treningi/');
  // Phones get a list (every field visible without sideways scrolling), larger screens a table.
  const schedule = isMobile
    ? page.getByRole('list', { name: 'Grafik zajęć' })
    : page.getByRole('table');
  const items = isMobile ? schedule.getByRole('listitem') : schedule.getByRole('row');
  const all = isMobile ? 3 : 4; // the table also has a header row
  // The filter is a client:visible island: scroll to it and wait until it has hydrated.
  await schedule.scrollIntoViewIfNeeded();
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await expect(items).toHaveCount(all);
  if (isMobile) await expect(schedule).toContainText('Sala testowa');

  await page.getByRole('button', { name: 'Grupa testowa B' }).click();
  await expect(page.getByRole('button', { name: 'Grupa testowa B' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(items).toHaveCount(all - 2);
  await expect(schedule).toContainText('18:00–19:30');

  await page.getByRole('button', { name: 'Wszystkie grupy' }).click();
  await expect(items).toHaveCount(all);
});

test('news list links to the post page', async ({ page }) => {
  await page.goto('/aktualnosci/');
  await page.getByRole('link', { name: 'Testowa aktualność', exact: true }).click();
  await expect(page).toHaveURL(/\/aktualnosci\/testowa-aktualnosc\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Testowa aktualność');
  await expect(page.getByText('15 października 2026')).toBeVisible();
});

test('home page shows groups, the next camp and the latest news', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Grupa testowa A' })).toBeVisible();
  await expect(page.getByText('Testowy obóz letni')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Testowa aktualność', exact: true })).toBeVisible();
});

test('contact page shows contact data from the CMS', async ({ page }) => {
  await page.goto('/kontakt/');
  await expect(
    page.getByRole('main').getByRole('link', { name: '+48 000 000 000' }),
  ).toHaveAttribute('href', 'tel:+48000000000');
  await expect(page.getByRole('main').getByText('Sala testowa', { exact: true })).toBeVisible();
});

test('club page links to the 1.5% page for OPP clubs and shows the KRS number', async ({
  page,
}) => {
  await page.goto('/klub/');
  await page.getByRole('link', { name: /Przekaż 1,5% podatku/ }).click();
  await expect(page.getByText('0000000000')).toBeVisible();
});

test('FAQ answers expand natively', async ({ page }) => {
  await page.goto('/klub/faq/');
  await page.getByText('Testowe pytanie?').click();
  await expect(page.getByText('Testowa odpowiedź.')).toBeVisible();
});
