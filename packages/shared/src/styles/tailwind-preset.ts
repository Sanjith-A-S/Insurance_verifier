import type { Config } from 'tailwindcss';

const preset: Partial<Config> = {
  darkMode: 'class',
  theme: {
    screens: {
      medium:   '600px',
      expanded: '840px',
      large:    '1200px',
      xlarge:   '1600px',
    },
    extend: {
      colors: {
        bg:              'var(--color-bg)',
        surface:         'var(--color-surface)',
        'surface-raised':'var(--color-surface-raised)',
        border:          'var(--color-border)',
        text:            'var(--color-text)',
        muted:           'var(--color-text-muted)',
        primary:         'var(--color-primary)',
        'primary-text':  'var(--color-primary-text)',
        accent:          'var(--color-accent)',
        success:         'var(--color-success)',
        warning:         'var(--color-warning)',
        error:           'var(--color-error)',
      },
      fontFamily: {
        sans: ['Roboto Flex', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl':'var(--radius-2xl)',
      },
      transitionDuration: {
        fast:   'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow:   'var(--duration-slow)',
      },
    },
  },
};

export default preset;

