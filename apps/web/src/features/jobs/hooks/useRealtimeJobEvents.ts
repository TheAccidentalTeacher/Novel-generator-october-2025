import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { env } from '@/config/env';

export type JobEvent = {
	id: string;
	type: string;
	timestamp: string;
	payload: Record<string, unknown>;
};

type HookState = {
	status: 'idle' | 'disabled' | 'connecting' | 'connected' | 'error';
	events: JobEvent[];
	error?: string;
};

type GatewayGenerationEvent = {
	readonly jobId: string;
	readonly emittedAt: string;
	readonly event: Record<string, unknown>;
};

type GatewayDomainEvent = {
	readonly jobId: string;
	readonly emittedAt: string;
	readonly event: Record<string, unknown>;
};

type GatewayStatusEvent = {
	readonly jobId: string;
	readonly emittedAt: string;
	readonly status: string;
	readonly snapshot?: Record<string, unknown> | null;
};

const GATEWAY_EVENTS = {
	generation: 'novel.generation-event',
	domain: 'novel.domain-event',
	status: 'novel.job-status',
	subscribed: 'novel.subscribed',
	unsubscribed: 'novel.unsubscribed',
	error: 'novel.error'
} as const;

const createSocket = (url: string): Socket =>
	io(url, {
		transports: ['websocket'],
		reconnectionAttempts: 3,
		autoConnect: false,
		path: '/ws',
		withCredentials: true
	});

const buildEventId = (prefix: string, seed?: string): string => {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}

	return `${prefix}-${seed ?? Date.now()}`;
};

const buildPlaceholderEvent = (jobId: string): JobEvent => ({
	id: buildEventId('placeholder', jobId),
	type: 'realtime.placeholder',
	timestamp: new Date().toISOString(),
	payload: {
		message: 'Realtime gateway not configured yet, streaming simulated payload.',
		jobId
	}
});

const mapGenerationEvent = (payload: GatewayGenerationEvent): JobEvent => ({
	id: buildEventId('generation', payload.emittedAt),
	type: 'realtime.generation',
	timestamp: payload.emittedAt,
	payload: {
		jobId: payload.jobId,
		stageEvent: payload.event
	}
});

const mapDomainEvent = (payload: GatewayDomainEvent): JobEvent => ({
	id: buildEventId('domain', payload.emittedAt),
	type: 'realtime.domain',
	timestamp: payload.emittedAt,
	payload: {
		jobId: payload.jobId,
		domainEvent: payload.event
	}
});

const mapStatusEvent = (payload: GatewayStatusEvent): JobEvent => ({
	id: buildEventId('status', `${payload.jobId}:${payload.status}:${payload.emittedAt}`),
	type: 'realtime.status',
	timestamp: payload.emittedAt,
	payload: {
		jobId: payload.jobId,
		status: payload.status,
		snapshot: payload.snapshot ?? null
	}
});

export const useRealtimeJobEvents = (jobId?: string): HookState => {
	const [state, setState] = useState<HookState>({ status: 'idle', events: [] });
	const socketRef = useRef<Socket | null>(null);

	const pushEvent = useCallback((event: JobEvent) => {
		setState((prev) => ({ ...prev, events: [event, ...prev.events].slice(0, 50) }));
	}, []);

	const teardownSocket = useCallback(() => {
		if (socketRef.current) {
			socketRef.current.removeAllListeners();
			socketRef.current.disconnect();
			socketRef.current = null;
		}
	}, []);

	useEffect(() => {
		if (!jobId) {
			setState({ status: 'idle', events: [] });
			teardownSocket();
			return;
		}

		if (!env.realtimeSocketUrl) {
			teardownSocket();
			setState({ status: 'disabled', events: [buildPlaceholderEvent(jobId)] });
			return;
		}

		setState({ status: 'connecting', events: [] });

		const socket = createSocket(env.realtimeSocketUrl);
		socketRef.current = socket;

		socket.on('connect', () => {
			socket.emit('subscribe', { jobId });
		});

		socket.on(GATEWAY_EVENTS.subscribed, () => {
			setState((prev) => ({ ...prev, status: 'connected' }));
		});

		socket.on(GATEWAY_EVENTS.generation, (payload: GatewayGenerationEvent) => {
			pushEvent(mapGenerationEvent(payload));
		});

		socket.on(GATEWAY_EVENTS.domain, (payload: GatewayDomainEvent) => {
			pushEvent(mapDomainEvent(payload));
		});

		socket.on(GATEWAY_EVENTS.status, (payload: GatewayStatusEvent) => {
			pushEvent(mapStatusEvent(payload));
		});

		socket.on(GATEWAY_EVENTS.error, (message: string | { readonly message?: string }) => {
			const errorMessage = typeof message === 'string' ? message : message?.message ?? 'Realtime gateway error.';
			setState((prev) => ({ ...prev, status: 'error', error: errorMessage }));
		});

		socket.on('connect_error', (error: Error) => {
			setState((prev) => ({ ...prev, status: 'error', error: error.message }));
		});

		socket.connect();

		return () => {
			socket.emit('unsubscribe', { jobId });
			teardownSocket();
		};
	}, [jobId, pushEvent, teardownSocket]);

	return useMemo(() => state, [state]);
};
