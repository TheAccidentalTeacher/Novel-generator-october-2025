import { tokens } from '@letswriteabook/ui-tokens';

const STYLE_ELEMENT_ID = 'lwb-design-tokens';

const createCssVariablesBlock = (vars: Record<string, string>): string =>
	Object.entries(vars)
		.map(([key, value]) => `  ${key}: ${value};`)
		.join('\n');

const getBaseVariables = (): Record<string, string> => ({
	'--color-primary': tokens.color.primary,
	'--color-accent': tokens.color.accent,
	'--color-neutral': tokens.color.neutral,
	'--color-surface': tokens.color.surface,
	'--color-success': tokens.color.success,
	'--color-warning': tokens.color.warning,
	'--color-danger': tokens.color.danger,
	'--color-info': tokens.color.info,
	'--color-text-primary': tokens.color.text.primary,
	'--color-text-secondary': tokens.color.text.secondary,
	'--color-text-muted': tokens.color.text.muted,
	'--color-text-inverse': tokens.color.text.inverse,
	'--font-sans': tokens.typography.fontFamily.sans.join(', '),
	'--font-mono': tokens.typography.fontFamily.mono.join(', '),
	'--font-size-xs': tokens.typography.fontSize.xs,
	'--font-size-sm': tokens.typography.fontSize.sm,
	'--font-size-base': tokens.typography.fontSize.base,
	'--font-size-lg': tokens.typography.fontSize.lg,
	'--font-size-xl': tokens.typography.fontSize.xl,
	'--font-size-2xl': tokens.typography.fontSize['2xl'],
	'--font-size-3xl': tokens.typography.fontSize['3xl'],
	'--line-height-tight': tokens.typography.lineHeight.tight,
	'--line-height-snug': tokens.typography.lineHeight.snug,
	'--line-height-normal': tokens.typography.lineHeight.normal,
	'--line-height-relaxed': tokens.typography.lineHeight.relaxed,
	'--space-xs': tokens.spacing.xs,
	'--space-sm': tokens.spacing.sm,
	'--space-md': tokens.spacing.md,
	'--space-lg': tokens.spacing.lg,
	'--space-xl': tokens.spacing.xl,
	'--space-2xl': tokens.spacing['2xl'],
	'--radius-sm': tokens.radii.sm,
	'--radius-lg': tokens.radii.lg,
	'--radius-xl': tokens.radii.xl,
	'--shadow-card': tokens.shadow.card,
	'--shadow-focus': tokens.shadow.focus,
	'--card-background': tokens.components.card.background,
	'--card-border': tokens.components.card.border,
	'--badge-neutral-bg': tokens.components.badge.neutral.background,
	'--badge-neutral-fg': tokens.components.badge.neutral.foreground,
	'--badge-info-bg': tokens.components.badge.info.background,
	'--badge-info-fg': tokens.components.badge.info.foreground,
	'--badge-success-bg': tokens.components.badge.success.background,
	'--badge-success-fg': tokens.components.badge.success.foreground,
	'--badge-warning-bg': tokens.components.badge.warning.background,
	'--badge-warning-fg': tokens.components.badge.warning.foreground,
	'--badge-danger-bg': tokens.components.badge.danger.background,
	'--badge-danger-fg': tokens.components.badge.danger.foreground
});

const getThemeVariables = (
	theme: (typeof tokens.themes.light | typeof tokens.themes.dark)
): Record<string, string> => ({
	'--color-primary': theme.primary,
	'--color-accent': theme.accent,
	'--color-neutral': theme.neutral,
	'--color-surface': theme['base-100'],
	'--color-surface-alt': theme['base-200'],
	'--color-surface-strong': theme['base-300'],
	'--color-text-primary': theme.text.primary,
	'--color-text-secondary': theme.text.secondary,
	'--color-text-muted': theme.text.muted,
	'--color-text-inverse': theme.text.inverse,
	'--color-success': theme.success,
	'--color-warning': theme.warning,
	'--color-danger': theme.error,
	'--color-info': theme.info,
	'--card-background': theme.components?.card.background ?? tokens.components.card.background,
	'--card-border': theme.components?.card.border ?? tokens.components.card.border,
	'--badge-neutral-bg': theme.components?.badge.neutral.background ?? tokens.components.badge.neutral.background,
	'--badge-neutral-fg': theme.components?.badge.neutral.foreground ?? tokens.components.badge.neutral.foreground,
	'--badge-info-bg': theme.components?.badge.info.background ?? tokens.components.badge.info.background,
	'--badge-info-fg': theme.components?.badge.info.foreground ?? tokens.components.badge.info.foreground,
	'--badge-success-bg': theme.components?.badge.success.background ?? tokens.components.badge.success.background,
	'--badge-success-fg': theme.components?.badge.success.foreground ?? tokens.components.badge.success.foreground,
	'--badge-warning-bg': theme.components?.badge.warning.background ?? tokens.components.badge.warning.background,
	'--badge-warning-fg': theme.components?.badge.warning.foreground ?? tokens.components.badge.warning.foreground,
	'--badge-danger-bg': theme.components?.badge.danger.background ?? tokens.components.badge.danger.background,
	'--badge-danger-fg': theme.components?.badge.danger.foreground ?? tokens.components.badge.danger.foreground
});

/**
 * Write runtime CSS variables using the published design tokens.
 * Generates a single <style> block that captures both light and dark themes.
 */
export const registerDesignTokens = (): void => {
	if (typeof document === 'undefined') {
		return;
	}

	const existing = document.getElementById(STYLE_ELEMENT_ID);
	const styleEl = existing instanceof HTMLStyleElement ? existing : document.createElement('style');
	styleEl.id = STYLE_ELEMENT_ID;
	styleEl.innerHTML = [
		`:root, [data-theme="${tokens.themes.light.name}"] {\n${createCssVariablesBlock({
			...getBaseVariables(),
			...getThemeVariables(tokens.themes.light)
		})}\n}`,
		`[data-theme="${tokens.themes.dark.name}"] {\n${createCssVariablesBlock({
			...getBaseVariables(),
			...getThemeVariables(tokens.themes.dark)
		})}\n}`
	].join('\n');

	if (!existing) {
		document.head.appendChild(styleEl);
	}
};
