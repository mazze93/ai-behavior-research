import { defineConfig, fontProviders } from 'astro/config';

// Static composition only: the existing registry Worker owns Cloudflare routing.
export default defineConfig({
  site: 'https://research.mazzeleczzare.com',
  output: 'static',
  publicDir: './public',
  build: { inlineStylesheets: 'never' },
  devToolbar: { enabled: false },
  fonts: [
    {
      name: 'Basteleur', cssVariable: '--font-cabinet',
      provider: fontProviders.local(), fallbacks: ['Georgia', 'serif'],
      options: { variants: [{
        src: ['../registry/public/fonts/Basteleur-Bold.woff2'],
        weight: '700', style: 'normal',
      }] },
    },
    {
      name: 'Bodoni Moda', cssVariable: '--font-poster',
      provider: fontProviders.local(), fallbacks: ['Georgia', 'serif'],
      options: { variants: [{
        src: ['./node_modules/@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-wght-normal.woff2'],
        weight: '400 900', style: 'normal',
      }] },
    },
    {
      name: 'Manrope', cssVariable: '--font-reading',
      provider: fontProviders.local(), fallbacks: ['Arial', 'sans-serif'],
      options: { variants: [{
        src: ['./node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2'],
        weight: '200 800', style: 'normal',
      }] },
    },
  ],
});
