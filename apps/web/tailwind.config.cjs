const defaultTheme = require('tailwindcss/defaultTheme');
const { tokens } = require('@letswriteabook/ui-tokens/dist');

const buildDaisyTheme = (theme) => ({
	[theme.name]: {
		primary: theme.primary,
		'primary-content': theme['primary-content'],
		accent: theme.accent,
		'accent-content': theme['accent-content'],
		neutral: theme.neutral,
		'neutral-content': theme['neutral-content'],
		'base-100': theme['base-100'],
		'base-200': theme['base-200'],
		'base-300': theme['base-300'],
		info: theme.info,
		success: theme.success,
		warning: theme.warning,
		error: theme.error
	}
});

module.exports = {
	content: ['./index.html', './src/**/*.{ts,tsx}'],
	theme: {
		extend: {
			colors: {
				brand: {
					primary: 'var(--color-primary)',
					accent: 'var(--color-accent)',
					neutral: 'var(--color-neutral)'
				},
				surface: {
					DEFAULT: 'var(--color-surface)',
					alt: 'var(--color-surface-alt)',
					strong: 'var(--color-surface-strong)'
				},
				status: {
					success: 'var(--color-success)',
					warning: 'var(--color-warning)',
					danger: 'var(--color-danger)',
					info: 'var(--color-info)'
				},
				text: {
					primary: 'var(--color-text-primary)',
					secondary: 'var(--color-text-secondary)',
					muted: 'var(--color-text-muted)',
					inverse: 'var(--color-text-inverse)'
				}
			},
			fontFamily: {
				sans: [...tokens.typography.fontFamily.sans, ...defaultTheme.fontFamily.sans],
				mono: [...tokens.typography.fontFamily.mono, ...defaultTheme.fontFamily.mono]
			},
			spacing: {
				xs: 'var(--space-xs)',
				sm: 'var(--space-sm)',
				md: 'var(--space-md)',
				lg: 'var(--space-lg)',
				xl: 'var(--space-xl)',
				'2xl': 'var(--space-2xl)'
			},
			borderRadius: {
				sm: tokens.radii.sm,
				lg: tokens.radii.lg,
				xl: tokens.radii.xl
			},
			boxShadow: {
				card: tokens.shadow.card,
				focus: tokens.shadow.focus
			}
		}
	},
	plugins: [require('daisyui')],
	daisyui: {
		themes: [buildDaisyTheme(tokens.themes.light), buildDaisyTheme(tokens.themes.dark)]
	}
};
