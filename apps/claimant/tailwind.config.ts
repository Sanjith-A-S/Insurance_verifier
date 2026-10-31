import type { Config } from 'tailwindcss';
import sharedPreset from '../../packages/shared/src/styles/tailwind-preset.ts';

const config: Config = {
  presets: [sharedPreset as any],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/shared/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;

