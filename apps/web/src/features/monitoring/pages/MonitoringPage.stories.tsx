import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { MonitoringPage } from './MonitoringPage';
import { createMonitoringSnapshotPlaceholder } from '../api/monitoring-placeholders';

const MonitoringPageStory = (): JSX.Element => {
	const [queryClient] = useState(() => {
		const client = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
					staleTime: 60_000,
					refetchOnMount: false,
					refetchOnReconnect: false,
					refetchOnWindowFocus: false
				}
			}
		});

		client.setQueryData(['monitoring', 'snapshot'], createMonitoringSnapshotPlaceholder());
		return client;
	});

	return (
		<QueryClientProvider client={queryClient}>
			<MonitoringPage />
		</QueryClientProvider>
	);
};

const meta = {
	title: 'Features/Monitoring/MonitoringPage',
	component: MonitoringPageStory,
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'Telemetry snapshot view backed by React Query. This story seeds the query cache with placeholder data so the layout can be reviewed without running the API service.'
			}
		}
	}
} satisfies Meta<typeof MonitoringPageStory>;

export default meta;

type Story = StoryObj<typeof MonitoringPageStory>;

export const PlaceholderSnapshot: Story = {
	render: () => <MonitoringPageStory />
};
