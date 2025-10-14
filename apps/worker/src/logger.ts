export type WorkerLogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface WorkerLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

export function createLogger(levels: readonly WorkerLogLevel[] = ['info', 'warn', 'error']): WorkerLogger {
  const service = 'worker';
  const enabledLevels = new Set(levels);

  const format = (level: WorkerLogLevel, message: string, context: Record<string, unknown> = {}) => {
    const payload = { level, service, message, ...context } satisfies Record<string, unknown>;
    return JSON.stringify(payload);
  };

  return {
    info(message, context) {
      if (!enabledLevels.has('info')) {
        return;
      }
      console.log(format('info', message, context));
    },
    warn(message, context) {
      if (!enabledLevels.has('warn')) {
        return;
      }
      console.warn(format('warn', message, context));
    },
    error(message, context) {
      if (!enabledLevels.has('error')) {
        return;
      }
      console.error(format('error', message, context));
    },
    debug(message, context) {
      if (!enabledLevels.has('debug')) {
        return;
      }
      console.log(format('debug', message, context));
    },
  } satisfies WorkerLogger;
}
