import { create } from '@storybook/theming/create';
import { tokens } from '@letswriteabook/ui-tokens';

export const storybookTheme = create({
	base: 'light',
	brandTitle: 'LetsWriteABook Console',
	brandUrl: 'https://github.com/TheAccidentalTeacher/Letswriteabook',
	colorPrimary: tokens.color.primary,
	colorSecondary: tokens.color.accent,
	appBg: tokens.color.surface,
	appContentBg: '#ffffff',
	appBorderColor: 'rgba(148, 163, 184, 0.24)',
	appBorderRadius: 12,
	fontBase: tokens.typography.fontFamily.sans.join(', ')
});
