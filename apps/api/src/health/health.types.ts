export type DependencyStatus = 'healthy' | 'unhealthy' | 'unknown';

export interface HealthPayload {
  readonly status: 'pass';
  readonly timestamp: string;
  readonly uptimeSeconds: number;
}

export interface ReadinessPayload extends HealthPayload {
  readonly dependencies: {
    readonly mongo: DependencyStatus;
    readonly redis: DependencyStatus;
  };
}
