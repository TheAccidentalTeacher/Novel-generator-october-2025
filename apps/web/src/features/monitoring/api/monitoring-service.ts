import { fetchMonitoringSnapshot } from './monitoring-api';
import { createMonitoringSnapshotPlaceholder } from './monitoring-placeholders';

import { isHttpError, type ApiResult } from '@/lib/api-client';

const logApiFailure = (scope: string, error: unknown) => {
	const base = `[monitoring] Failed to fetch ${scope}`;
	if (isHttpError(error)) {
		console.warn(`${base}: HTTP ${error.status}`, error.body ?? error);
	} else {
		console.warn(base, error);
	}
};

const withPlaceholder = async <T>(
	op: () => Promise<ApiResult<T>>,
	placeholder: ApiResult<T>,
	options?: { readonly scope: string; readonly rethrowStatuses?: ReadonlyArray<number> }
): Promise<ApiResult<T>> => {
	try {
		return await op();
	} catch (error) {
		if (isHttpError(error) && options?.rethrowStatuses?.includes(error.status)) {
			throw error;
		}

		logApiFailure(options?.scope ?? 'snapshot', error);
		return placeholder;
	}
};

export const getMonitoringSnapshot = async () =>
	withPlaceholder(fetchMonitoringSnapshot, createMonitoringSnapshotPlaceholder(), {
		scope: 'monitoring snapshot'
	});
