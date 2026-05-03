import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    // TODO(#36): enable once @agentskit/os-ui ships its dist
    // './node_modules/@agentskit/os-ui/dist/**/*.{js,cjs}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SF Mono',
          'ui-monospace',
          'Menlo',
          'Monaco',
          'monospace',
        ],
      },
      colors: {
        ink: {
          DEFAULT: '#f5f5f7',
          muted: '#a1a1aa',
          subtle: '#71717a',
        },
        surface: {
          DEFAULT: '#08090c',
          alt: '#0d0e12',
          dim: '#0a0b0e',
        },
        panel: {
          DEFAULT: '#111217',
          alt: '#16171d',
        },
        line: {
          DEFAULT: '#1f2025',
          soft: '#141519',
        },
        accent: {
          DEFAULT: '#22d3ee',
          hover: '#67e8f9',
          dim: '#0e7490',
        },
      },
      letterSpacing: {
        tighter: '-0.025em',
        tightest: '-0.04em',
      },
    },
  },
  plugins: [],
}

export default config
