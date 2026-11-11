import { describe, expect, it } from 'vitest';
import { formatDate, formatDateRange, upcoming, weekdayName } from './format';

describe('format helpers', () => {
  it('names weekdays in Polish', () => {
    expect(weekdayName(1)).toBe('Poniedziałek');
    expect(weekdayName(7)).toBe('Niedziela');
    expect(weekdayName(9)).toBe('');
  });

  it('formats dates in Polish', () => {
    expect(formatDate('2026-10-15')).toBe('15 października 2026');
  });

  it('shortens date ranges within one month or year', () => {
    expect(formatDateRange('2027-07-01', '2027-07-10')).toBe('1–10 lipca 2027');
    expect(formatDateRange('2027-06-28', '2027-07-05')).toBe('28 czerwca – 5 lipca 2027');
    expect(formatDateRange('2026-12-28', '2027-01-03')).toBe('28 grudnia 2026 – 3 stycznia 2027');
    expect(formatDateRange('2027-07-01', '2027-07-01')).toBe('1 lipca 2027');
  });

  it('keeps events that have not ended yet', () => {
    const items = [{ endDate: '2026-11-01' }, { endDate: '2026-11-07' }, { endDate: '2027-01-01' }];
    expect(upcoming(items, '2026-11-07')).toEqual([
      { endDate: '2026-11-07' },
      { endDate: '2027-01-01' },
    ]);
  });
});
