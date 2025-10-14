import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

export const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false
			},
			mutations: {
				retry: false
			}
		}
	});

export const createQueryClientWrapper = (client?: QueryClient) => {
	const queryClient = client ?? createTestQueryClient();

	const Wrapper = ({ children }: { readonly children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	return { Wrapper, queryClient };
};

export const renderWithQueryClient = (ui: ReactElement, client?: QueryClient) => {
	const { Wrapper, queryClient } = createQueryClientWrapper(client);

	return {
		queryClient,
		...render(ui, { wrapper: Wrapper })
	};
};
