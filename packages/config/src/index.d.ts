declare const ENV_VALUES: readonly ["development", "staging", "production"];
type EnvName = (typeof ENV_VALUES)[number];
type Service = 'api' | 'worker';
interface InitializeOptions {
    readonly service?: Service;
    readonly rootDir?: string;
    readonly additionalEnvFiles?: readonly string[];
    readonly override?: boolean;
}
interface ApiConfig {
    readonly nodeEnv: EnvName;
    readonly port: number;
    readonly mongoUri?: string;
    readonly redisUrl?: string;
    readonly openAiApiKey?: string;
    readonly socketClientOrigin: string;
    readonly sentryDsn?: string;
    readonly novelQueueName: string;
    readonly socketMaxConnections: number;
    readonly socketMaxConnectionsPerOrigin: number;
    readonly socketMaxSubscriptionsPerClient: number;
    readonly socketIdleTimeoutMs: number;
}
interface WorkerConfig {
    readonly nodeEnv: EnvName;
    readonly mongoUri?: string;
    readonly redisUrl?: string;
    readonly openAiApiKey?: string;
    readonly modelOverrides?: Record<string, string>;
    readonly sentryDsn?: string;
    readonly novelQueueName: string;
}
export declare function initializeConfig(options?: InitializeOptions): void;
export declare function loadApiConfig(options?: InitializeOptions): ApiConfig;
export declare function loadWorkerConfig(options?: InitializeOptions): WorkerConfig;
export type { ApiConfig, WorkerConfig };
