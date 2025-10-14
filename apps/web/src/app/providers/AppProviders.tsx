import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { useUiStore } from '@/app/state/ui-store';

const createQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: 1,
				staleTime: 30_000,
				refetchOnWindowFocus: false
			},
			mutations: {
				retry: 1
			}
		}
	});

export const AppProviders = ({ children }: PropsWithChildren): JSX.Element => {
	const [client] = useState(createQueryClient);
	const isQueryDevtoolsVisible = useUiStore((state) => state.isQueryDevtoolsVisible);

	return (
		<QueryClientProvider client={client}>
			{children}
			{import.meta.env.DEV ? (
				<ReactQueryDevtools initialIsOpen={isQueryDevtoolsVisible} buttonPosition="bottom-right" />
			) : null}
		</QueryClientProvider>
	);
};
