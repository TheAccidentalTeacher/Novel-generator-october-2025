// UI token definitions shared across LetsWriteABook surfaces.
//
// The token structure intentionally captures both semantic hues and layout primitives so
// multiple environments (web app, Storybook, marketing surfaces) can remain consistent.
export const tokens = {
  color: {
    primary: '#2563eb',
    accent: '#7c3aed',
    neutral: '#1e293b',
    surface: '#f8fafc',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#dc2626',
    info: '#0ea5e9',
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      muted: '#64748b',
      inverse: '#f8fafc'
    }
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      mono: [
        'Fira Code',
        'ui-monospace',
        'SFMono-Regular',
        'Menlo',
        'Monaco',
        'Consolas',
        'Liberation Mono',
        'Courier New',
        'monospace'
      ]
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    },
    lineHeight: {
      tight: '1.2',
      snug: '1.35',
      normal: '1.5',
      relaxed: '1.75'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem'
  },
  radii: {
    sm: '0.625rem',
    lg: '1.25rem',
    xl: '1.75rem'
  },
  shadow: {
    card: '0 20px 45px rgba(15, 23, 42, 0.08)',
    focus: '0 0 0 4px rgba(37, 99, 235, 0.15)'
  },
  components: {
    card: {
      background: 'rgba(248, 250, 252, 0.92)',
      border: 'rgba(15, 23, 42, 0.08)'
    },
    badge: {
      neutral: { background: 'rgba(15, 23, 42, 0.08)', foreground: '#475569' },
      info: { background: 'rgba(14, 165, 233, 0.16)', foreground: '#0369a1' },
      success: { background: 'rgba(34, 197, 94, 0.18)', foreground: '#166534' },
      warning: { background: 'rgba(234, 179, 8, 0.2)', foreground: '#854d0e' },
      danger: { background: 'rgba(248, 113, 113, 0.18)', foreground: '#991b1b' }
    }
  },
  themes: {
    light: {
      name: 'lwb',
      primary: '#2563eb',
      'primary-content': '#ffffff',
      accent: '#7c3aed',
      'accent-content': '#fdf4ff',
      neutral: '#1e293b',
      'neutral-content': '#e2e8f0',
      'base-100': '#f8fafc',
      'base-200': '#e2e8f0',
      'base-300': '#cbd5f5',
      info: '#0ea5e9',
      success: '#16a34a',
      warning: '#f59e0b',
      error: '#dc2626',
      text: {
        primary: '#0f172a',
        secondary: '#475569',
        muted: '#64748b',
        inverse: '#f8fafc'
      },
      components: {
        card: {
          background: 'rgba(248, 250, 252, 0.92)',
          border: 'rgba(15, 23, 42, 0.08)'
        },
        badge: {
          neutral: { background: 'rgba(15, 23, 42, 0.08)', foreground: '#475569' },
          info: { background: 'rgba(14, 165, 233, 0.16)', foreground: '#0369a1' },
          success: { background: 'rgba(34, 197, 94, 0.18)', foreground: '#166534' },
          warning: { background: 'rgba(234, 179, 8, 0.2)', foreground: '#854d0e' },
          danger: { background: 'rgba(248, 113, 113, 0.18)', foreground: '#991b1b' }
        }
      }
    },
    dark: {
      name: 'lwb-dark',
      primary: '#60a5fa',
      'primary-content': '#0f172a',
      accent: '#c084fc',
      'accent-content': '#1e1b4b',
      neutral: '#0f1729',
      'neutral-content': '#cbd5f5',
      'base-100': '#0f1729',
      'base-200': '#1e293b',
      'base-300': '#334155',
      info: '#38bdf8',
      success: '#22c55e',
      warning: '#f97316',
      error: '#f87171',
      text: {
        primary: '#e2e8f0',
        secondary: '#cbd5f5',
        muted: '#94a3b8',
        inverse: '#0f172a'
      },
      components: {
        card: {
          background: 'rgba(15, 23, 41, 0.7)',
          border: 'rgba(148, 163, 184, 0.2)'
        },
        badge: {
          neutral: { background: 'rgba(148, 163, 184, 0.18)', foreground: '#e2e8f0' },
          info: { background: 'rgba(56, 189, 248, 0.25)', foreground: '#bae6fd' },
          success: { background: 'rgba(74, 222, 128, 0.25)', foreground: '#bbf7d0' },
          warning: { background: 'rgba(251, 191, 36, 0.25)', foreground: '#fde68a' },
          danger: { background: 'rgba(248, 113, 113, 0.3)', foreground: '#fecaca' }
        }
      }
    }
  }
} as const;
