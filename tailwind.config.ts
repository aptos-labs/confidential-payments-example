import { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

import { colors, cssVars, fontFamily, typography } from './src/theme/config'

import twAnimatePlugin from 'tailwindcss-animate'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily,

      colors: {
        ...colors,
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
    },
  },
  plugins: [
    twAnimatePlugin,

    plugin(({ addBase }) =>
      addBase({
        ':root': {
          ...cssVars.light,
        },
        '.dark:root': {
          ...cssVars.dark,
        },
      }),
    ),

    plugin(({ addUtilities }) => {
      addUtilities(typography)
    }),
  ],
}

export default config
