/**
 * Training schedule with a filter by group (React island).
 * The server-rendered HTML already contains the full schedule, so it works without JavaScript;
 * after hydration the buttons narrow it down to one group.
 * Phones get a stacked list (day and time first, then group and place), because a four-column
 * table would hide the place behind a sideways scroll; larger screens get the table.
 */
import { useState } from 'react';
import { nbsp } from '../lib/typography';

export interface ScheduleRow {
  id: string;
  groupName: string;
  dayName: string;
  start: string;
  end: string;
  venue?: string | undefined;
}

interface Props {
  rows: readonly ScheduleRow[];
  groups: readonly string[];
}

const ALL = '';

export default function ScheduleFilter({ rows, groups }: Props) {
  const [selected, setSelected] = useState(ALL);
  const visible = selected === ALL ? rows : rows.filter((row) => row.groupName === selected);

  const button = (value: string, label: string) => (
    <button
      key={value || 'all'}
      type="button"
      aria-pressed={selected === value}
      onClick={() => setSelected(value)}
      className="rounded-full border-2 border-ink px-4 py-2 font-semibold hover:bg-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red aria-pressed:bg-ink aria-pressed:text-white aria-pressed:hover:bg-ink forced-colors:aria-pressed:border-[Highlight] forced-colors:aria-pressed:bg-[Highlight] forced-colors:aria-pressed:text-[HighlightText] forced-colors:aria-pressed:forced-color-adjust-none"
    >
      {nbsp(label)}
    </button>
  );

  return (
    <div>
      {groups.length > 1 && (
        <div role="group" aria-label="Pokaż zajęcia grupy" className="mb-6 flex flex-wrap gap-2">
          {button(ALL, 'Wszystkie grupy')}
          {groups.map((group) => button(group, group))}
        </div>
      )}

      {/* Phones: one item per training (display:none from sm, so screen readers get one version). */}
      <ul
        aria-label="Grafik zajęć"
        className="divide-y divide-ink/15 border-y-2 border-ink sm:hidden"
      >
        {visible.map((row) => (
          <li key={row.id} className="py-3">
            <p className="font-semibold">
              {row.dayName},{' '}
              <span className="whitespace-nowrap">
                {row.start}–{row.end}
              </span>
            </p>
            <p>{nbsp(row.groupName)}</p>
            {row.venue && <p className="text-ink/80">{row.venue}</p>}
          </li>
        ))}
      </ul>

      {/* Larger screens: the table. Scrollable if ever too narrow, so reachable by keyboard. */}
      <div
        className="hidden overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red sm:block"
        tabIndex={0}
        role="region"
        aria-label="Tabela z grafikiem zajęć"
      >
        <table className="w-full min-w-[32rem] border-collapse text-left">
          <caption className="sr-only">Grafik zajęć{selected ? ` – ${selected}` : ''}</caption>
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className="py-2 pr-4">
                Dzień
              </th>
              <th scope="col" className="py-2 pr-4">
                Godziny
              </th>
              <th scope="col" className="py-2 pr-4">
                Grupa
              </th>
              <th scope="col" className="py-2">
                Miejsce
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-b border-ink/15">
                <td className="py-3 pr-4 font-semibold">{row.dayName}</td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  {row.start}–{row.end}
                </td>
                <td className="py-3 pr-4">{nbsp(row.groupName)}</td>
                <td className="py-3">{row.venue ?? '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
