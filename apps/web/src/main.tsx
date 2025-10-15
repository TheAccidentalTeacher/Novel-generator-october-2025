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
      {/* Opt-in to React Router v7 startTransition behavior to remove the deprecation warning. */}
      <RouterProvider
        router={router}
        future={{ v7_startTransition: true } as Record<string, unknown>}
      />
    </AppProviders>
  </StrictMode>,
);
