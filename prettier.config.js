// @ts-check
/**
 * Prettier config shared by the whole workspace.
 * prettier-plugin-tailwindcss must stay last in the plugin list.
 * @type {import('prettier').Config}
 */
export default {
  singleQuote: true,
  printWidth: 100,
  plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
  overrides: [{ files: '*.astro', options: { parser: 'astro' } }],
  // Tailwind v4: the class sorter reads the theme from the CSS entry file.
  tailwindStylesheet: './apps/web/src/styles/global.css',
};
