import './app/styles/global.css';
import './styles/forms.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { AppProviders } from '@/app/providers/AppProviders';
import { router } from '@/app/router';
import { registerDesignTokens } from '@/app/styles/register-tokens';

const mountNode = document.getElementById('root');

if (!mountNode) {
	throw new Error('Failed to locate the root element for the web application.');
}

registerDesignTokens();

createRoot(mountNode).render(
	<StrictMode>
		<AppProviders>
			<RouterProvider router={router} />
		</AppProviders>
	</StrictMode>
);
