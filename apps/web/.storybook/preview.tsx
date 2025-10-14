/// <reference types="vite/client" />
import type { Preview } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { tokens } from '@letswriteabook/ui-tokens';

import { AppProviders } from '../src/app/providers/AppProviders';
import { registerDesignTokens } from '../src/app/styles/register-tokens';
import '../src/app/styles/global.css';

if (typeof window !== 'undefined') {
	registerDesignTokens();
}

const themeOptions = [
	{ value: tokens.themes.light.name, title: 'Light', icon: 'circlehollow' },
	{ value: tokens.themes.dark.name, title: 'Dark', icon: 'contrast' }
];

const preview: Preview = {
	parameters: {
		actions: { argTypesRegex: '^on[A-Z].*' },
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		layout: 'fullscreen',
		backgrounds: {
			default: 'Surface',
			values: [
				{ name: 'Surface', value: tokens.color.surface },
				{ name: 'Neutral', value: tokens.color.neutral },
				{ name: 'Night', value: tokens.themes.dark['base-100'] }
			]
		}
	},
	globalTypes: {
		theme: {
			description: 'Switch between light and dark themes',
			defaultValue: tokens.themes.light.name,
			toolbar: {
				icon: 'mirror',
				items: themeOptions,
				dynamicTitle: true
			}
		}
	},
	decorators: [
		(Story, context) => {
			const theme = context.globals.theme ?? tokens.themes.light.name;
			const backgroundClass = theme === tokens.themes.dark.name ? 'bg-base-200/60' : 'bg-base-200';
			if (typeof document !== 'undefined') {
				document.documentElement.setAttribute('data-theme', theme);
			}
			return (
				<MemoryRouter initialEntries={['/']}>
					<AppProviders>
						<div className={`min-h-screen ${backgroundClass} p-8 transition-colors duration-150`} data-theme={theme}>
							<Story />
						</div>
					</AppProviders>
				</MemoryRouter>
			);
		}
	]
};

export default preview;
