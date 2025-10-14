import { createBrowserRouter, type RouteObject } from 'react-router-dom';

import { AppLayout } from '@/app/AppLayout';
import { HomePage } from '@/features/home/pages/HomePage';
import { GenerationPage } from '@/features/generation/pages/GenerationPage';
import { JobDetailPage } from '@/features/jobs/pages/JobDetailPage';
import { JobListPage } from '@/features/jobs/pages/JobListPage';
import { MonitoringPage } from '@/features/monitoring/pages/MonitoringPage';
import { NotFoundPage } from '@/features/not-found/NotFoundPage';

const routes: RouteObject[] = [
	{
		path: '/',
		element: <AppLayout />,
		children: [
			{ index: true, element: <HomePage /> },
			{ path: 'generation', element: <GenerationPage /> },
			{ path: 'jobs', element: <JobListPage /> },
			{ path: 'jobs/:jobId', element: <JobDetailPage /> },
			{ path: 'monitoring', element: <MonitoringPage /> },
			{ path: '*', element: <NotFoundPage /> }
		]
	}
];

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter(routes);
