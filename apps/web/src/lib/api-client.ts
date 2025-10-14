import { env } from '@/config/env';

export class HttpError extends Error {
	readonly status: number;
	readonly body?: unknown;

	constructor(status: number, message: string, body?: unknown) {
		super(message);
		this.name = 'HttpError';
		this.status = status;
		this.body = body;
	}
}

const isHttpError = (error: unknown): error is HttpError => error instanceof HttpError;

const toUrl = (path: string | URL): URL => {
	if (path instanceof URL) {
		return path;
	}

	try {
		return new URL(path, env.apiBaseUrl);
	} catch (error) {
		throw new Error(`Failed to construct URL for path: ${path}`, { cause: error });
	}
};

const readErrorBody = async (response: Response): Promise<unknown> => {
	const contentType = response.headers.get('content-type');

	if (contentType?.includes('application/json')) {
		try {
			return await response.json();
		} catch {
			return undefined;
		}
	}

	try {
		return await response.text();
	} catch {
		return undefined;
	}
};

export const getJson = async <T>(path: string | URL, init?: RequestInit): Promise<T> => {
	const url = toUrl(path);

	const response = await fetch(url.toString(), {
		...init,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(init?.headers ?? {})
		}
	});

	if (!response.ok) {
		const body = await readErrorBody(response);
		throw new HttpError(
			response.status,
			`Request to ${url.toString()} failed with status ${response.status}`,
			body
		);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return (await response.json()) as T;
};

export const postJson = async <TRequest, TResponse>(
	path: string | URL,
	body: TRequest,
	init?: RequestInit
): Promise<TResponse> => {
	const url = toUrl(path);

	const response = await fetch(url.toString(), {
		method: 'POST',
		body: JSON.stringify(body),
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(init?.headers ?? {})
		},
		...init
	});

	if (!response.ok) {
		const responseBody = await readErrorBody(response);
		throw new HttpError(
			response.status,
			`Request to ${url.toString()} failed with status ${response.status}`,
			responseBody
		);
	}

	if (response.status === 204) {
		return undefined as TResponse;
	}

	return (await response.json()) as TResponse;
};

export type ApiResultSource = 'api' | 'placeholder';

export type ApiResult<T> = {
	readonly data: T;
	readonly source: ApiResultSource;
};

export const createApiResult = <T>(data: T, source: ApiResultSource = 'api'): ApiResult<T> => ({
	data,
	source
});

export { isHttpError };
