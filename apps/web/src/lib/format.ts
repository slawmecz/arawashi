/** Polish formatting helpers for dates and the training schedule. */

/** Day names indexed by ISO weekday (1 = Monday … 7 = Sunday). */
export const WEEKDAYS = [
  '',
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
  'Niedziela',
] as const;

export function weekdayName(day: number): string {
  return WEEKDAYS[day] ?? '';
}

/** "2026-10-15" → "15 października 2026". */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** A date range, shortened when both dates share the month or year: "1–10 lipca 2027". */
export function formatDateRange(start: string, end: string): string {
  if (start === end) return formatDate(start);
  const [sy, sm] = start.split('-');
  const [ey, em] = end.split('-');
  const startDay = Number(start.slice(8, 10));
  if (sy === ey && sm === em) return `${startDay}–${formatDate(end)}`;
  if (sy === ey) {
    const startNoYear = new Intl.DateTimeFormat('pl-PL', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${start}T00:00:00Z`));
    return `${startNoYear} – ${formatDate(end)}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** Keeps only items whose end date is today or later (ISO date strings compare correctly). */
export function upcoming<T extends { endDate: string }>(items: readonly T[], today: string): T[] {
  return items.filter((item) => item.endDate >= today);
}
