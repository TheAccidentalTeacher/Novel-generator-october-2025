import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { io } from 'socket.io-client';

import { useRealtimeJobEvents } from './useRealtimeJobEvents';

const mockEnv = vi.hoisted(() => ({
	apiBaseUrl: 'http://localhost:3001',
	realtimeSocketUrl: null as string | null
}));

vi.mock('@/config/env', () => ({ env: mockEnv }));

class FakeSocket {
	readonly emitted: Array<{ event: string; payload: unknown }> = [];
	readonly listeners: Map<string, Array<(payload?: unknown) => void>> = new Map();
	public connected = false;
	public disconnectCalls = 0;

	constructor(public readonly url: string, public readonly options: Record<string, unknown>) {}

	on(event: string, handler: (payload?: unknown) => void) {
		const handlers = this.listeners.get(event) ?? [];
		handlers.push(handler);
		this.listeners.set(event, handlers);
		return this;
	}

	emit(event: string, payload?: unknown) {
		this.emitted.push({ event, payload });
		return true;
	}

	connect = vi.fn(() => {
		this.connected = true;
	});

	disconnect = vi.fn(() => {
		this.connected = false;
		this.disconnectCalls += 1;
	});

	removeAllListeners = vi.fn(() => {
		this.listeners.clear();
		return this;
	});

	trigger(event: string, payload?: unknown) {
		(this.listeners.get(event) ?? []).forEach((handler) => handler(payload));
	}
}

const sockets: FakeSocket[] = [];


vi.mock('socket.io-client', () => ({
	io: vi.fn((url: string, options: Record<string, unknown>) => {
		const socket = new FakeSocket(url, options);
		sockets.push(socket);
		return socket as unknown;
	})
}));

const resetMocks = () => {
	sockets.length = 0;
	vi.mocked(io).mockClear();
};

describe('useRealtimeJobEvents', () => {
	beforeEach(() => {
		resetMocks();
		mockEnv.realtimeSocketUrl = null;
	});

	it('stays idle when no job id is provided', () => {
		const { result } = renderHook(() => useRealtimeJobEvents(undefined));

		expect(result.current.status).toBe('idle');
		expect(result.current.events).toHaveLength(0);
		expect(vi.mocked(io)).not.toHaveBeenCalled();
	});

	it('returns a placeholder event when realtime is disabled', async () => {
		const jobId = 'demo-job-id';
		mockEnv.realtimeSocketUrl = null;

		const { result } = renderHook(() => useRealtimeJobEvents(jobId));

		await waitFor(() => expect(result.current.status).toBe('disabled'));
		expect(result.current.events).toHaveLength(1);
		expect(result.current.events[0]).toMatchObject({
			type: 'realtime.placeholder',
			payload: { jobId }
		});
		expect(vi.mocked(io)).not.toHaveBeenCalled();
	});

	it('connects to the realtime gateway and streams events', async () => {
		const jobId = 'novel-42';
		mockEnv.realtimeSocketUrl = 'https://socket.example.com';

		const { result, unmount } = renderHook(() => useRealtimeJobEvents(jobId));

		await waitFor(() => expect(result.current.status).toBe('connecting'));
		await waitFor(() => expect(sockets.length).toBeGreaterThan(0));

		expect(vi.mocked(io)).toHaveBeenCalledWith('https://socket.example.com', expect.objectContaining({
			autoConnect: false,
			reconnectionAttempts: 3,
			transports: ['websocket'],
			path: '/ws',
			withCredentials: true
		}));

		const socket = sockets.at(-1);
		expect(socket).toBeDefined();
		await waitFor(() => expect(socket?.connect).toHaveBeenCalled());

		act(() => {
			socket?.trigger('connect');
		});

		expect(socket?.emitted).toContainEqual({ event: 'subscribe', payload: { jobId } });

		const subscribedAt = new Date().toISOString();
		act(() => {
			socket?.trigger('novel.subscribed', { jobId, subscribedAt });
		});

		await waitFor(() => expect(result.current.status).toBe('connected'));

		const generationPayload = {
			jobId,
			emittedAt: new Date().toISOString(),
			event: { type: 'stage-log', stage: 'analysis', level: 'info' }
		};

		act(() => {
			socket?.trigger('novel.generation-event', generationPayload);
		});

		await waitFor(() =>
			expect(result.current.events[0]).toMatchObject({
				type: 'realtime.generation',
				payload: {
					jobId,
					stageEvent: generationPayload.event
				}
			})
		);

		const statusPayload = {
			jobId,
			emittedAt: new Date().toISOString(),
			status: 'running',
			snapshot: { queue: 'novel-generation' }
		};

		act(() => {
			socket?.trigger('novel.job-status', statusPayload);
		});

		await waitFor(() =>
			expect(result.current.events[0]).toMatchObject({
				type: 'realtime.status',
				payload: {
					jobId,
					status: 'running',
					snapshot: statusPayload.snapshot
				}
			})
		);

		const errorMessage = 'gateway offline';
		act(() => {
			socket?.trigger('novel.error', errorMessage);
		});

		await waitFor(() => expect(result.current.status).toBe('error'));
		expect(result.current.error).toBe(errorMessage);

		act(() => {
			socket?.trigger('connect_error', new Error('connect failed'));
		});

		await waitFor(() => expect(result.current.error).toBe('connect failed'));

		act(() => {
			unmount();
		});

		expect(socket?.emitted).toContainEqual({ event: 'unsubscribe', payload: { jobId } });
		expect(socket?.disconnect).toHaveBeenCalledTimes(1);
		expect(socket?.removeAllListeners).toHaveBeenCalledTimes(1);
	});

	it('keeps only the most recent 50 events', async () => {
		const jobId = 'trim-job';
		mockEnv.realtimeSocketUrl = 'https://socket.example.com';

		const { result } = renderHook(() => useRealtimeJobEvents(jobId));

		await waitFor(() => expect(sockets.length).toBeGreaterThan(0));
		const socket = sockets.at(-1);

		act(() => {
			socket?.trigger('connect');
			socket?.trigger('novel.subscribed', { jobId, subscribedAt: new Date().toISOString() });
		});

		await waitFor(() => expect(result.current.status).toBe('connected'));

		act(() => {
			for (let index = 0; index < 60; index += 1) {
				socket?.trigger('novel.generation-event', {
					jobId,
					emittedAt: new Date(Date.now() + index).toISOString(),
					event: { type: 'stage-log', index }
				});
			}
		});

		await waitFor(() => expect(result.current.events).toHaveLength(50));
		expect(result.current.events[0]?.payload).toMatchObject({ stageEvent: { index: 59 } });
		expect(result.current.events.at(-1)?.payload).toMatchObject({ stageEvent: { index: 10 } });
	});
});
