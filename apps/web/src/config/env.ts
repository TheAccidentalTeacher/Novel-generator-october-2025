import { z } from 'zod';

const envSchema = z.object({
	VITE_API_BASE_URL: z.string().url().optional(),
	VITE_REALTIME_SOCKET_URL: z.string().url().optional()
});

const parsed = envSchema.safeParse({
	VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
	VITE_REALTIME_SOCKET_URL: import.meta.env.VITE_REALTIME_SOCKET_URL
});

if (!parsed.success) {
	console.error('Invalid frontend environment variables', parsed.error.flatten().fieldErrors);
	throw new Error('Failed to parse web environment variables.');
}

const envVars = parsed.data;

export const env = {
	apiBaseUrl: envVars.VITE_API_BASE_URL ?? 'http://localhost:3001',
	realtimeSocketUrl: envVars.VITE_REALTIME_SOCKET_URL ?? envVars.VITE_API_BASE_URL ?? null
};
