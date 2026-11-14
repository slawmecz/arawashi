/** Slugs for news URLs; must match the website's rule ^[a-z0-9]+(?:-[a-z0-9]+)*$. */
const POLISH: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

/** "Obóz letni 2027!" → "oboz-letni-2027" (transliterates Polish letters). */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[ąćęłńóśźż]/g, (letter) => POLISH[letter] ?? letter)
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      // Cutting at 80 characters can leave a hyphen at the end.
      .replace(/-+$/, '')
  );
}

/** The first address no other document uses: "tytul", then "tytul-2", "tytul-3"… */
export async function firstFreeSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  for (let n = 1; ; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (!(await isTaken(candidate))) return candidate;
  }
}
