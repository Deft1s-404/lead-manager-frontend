import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Atualiza paleta primária para o dourado da marca
        primary: {
          DEFAULT: '#d4b26e',
          dark: '#b8924a',
          light: '#ead9ae'
        },
        slate: {
          950: '#0f172a'
        }
      }
    }
  },
  plugins: []
};

export default config;
