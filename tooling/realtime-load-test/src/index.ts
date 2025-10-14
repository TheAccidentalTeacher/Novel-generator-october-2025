import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { loadHarnessConfig } from './config-file.js';
import type { HarnessConfig, HarnessOptions, ScenarioResult } from './types.js';
import { getScenario, listScenarios } from './scenarios/index.js';
import { logError, logInfo, logSuccess } from './utils/log.js';

async function main(): Promise<void> {
  const scenarios = listScenarios();

  const parser = yargs(hideBin(process.argv))
    .scriptName('realtime-load-test')
    .usage('$0 --scenario <name> [options]')
    .option('scenario', {
      alias: 's',
      choices: scenarios.map((scenario) => scenario.name),
      describe: 'Scenario to execute',
      demandOption: true,
      type: 'string',
    })
    .option('config', {
      alias: 'c',
      describe: 'Path to JSON config file containing default connection details and scenario overrides.',
      type: 'string',
    })
    .option('api-url', {
      describe: 'Base URL of the API hosting the NovelEventsGateway.',
      type: 'string',
      defaultDescription: 'http://localhost:3000',
    })
    .option('metrics-path', {
      describe: 'Path for the gateway metrics endpoint.',
      type: 'string',
      defaultDescription: '/internal/realtime/metrics',
    })
    .option('ws-path', {
      describe: 'Websocket path configured on the gateway.',
      type: 'string',
      defaultDescription: '/ws',
    })
    .option('origin', {
      describe: 'Origin header value accepted by the gateway.',
      type: 'string',
    })
    .option('alternate-origin', {
      describe: 'Optional alternate origin used by specific scenarios.',
      type: 'string',
    })
    .option('attempts', {
      describe: 'Override the number of connection attempts (0 uses scenario default).',
      type: 'number',
      defaultDescription: '0',
    })
    .option('extras', {
      describe: 'Additional attempts beyond the configured limit for quota scenarios.',
      type: 'number',
      defaultDescription: '3',
    })
    .option('job-count', {
      describe: 'Override the number of subscription attempts (0 uses limit + extras).',
      type: 'number',
      defaultDescription: '0',
    })
    .option('delay', {
      describe: 'Delay in milliseconds between sequential client operations.',
      type: 'number',
      defaultDescription: '25',
    })
    .option('settle', {
      describe: 'Settle time in milliseconds before sampling metrics.',
      type: 'number',
      defaultDescription: '250',
    })
    .option('connect-timeout', {
      describe: 'Connection timeout in milliseconds.',
      type: 'number',
      defaultDescription: '5000',
    })
    .option('disconnect-timeout', {
      describe: 'Disconnect timeout in milliseconds for cleanup.',
      type: 'number',
      defaultDescription: '2000',
    })
    .option('redis-url', {
      describe: 'Optional Redis URL for scenarios that publish test events.',
      type: 'string',
    })
    .option('mongo-uri', {
      describe: 'Optional MongoDB connection string for scenarios that seed persisted events.',
      type: 'string',
    })
    .option('event-count', {
      describe: 'Number of events to seed or publish during burst scenarios.',
      type: 'number',
      defaultDescription: '50',
    })
    .option('client-count', {
      describe: 'Number of concurrent websocket clients for broadcast scenarios.',
      type: 'number',
      defaultDescription: '200',
    })
    .option('replay-threshold', {
      describe: 'Maximum acceptable catch-up replay duration in milliseconds.',
      type: 'number',
      defaultDescription: '1000',
    })
    .option('latency-threshold', {
      describe: 'Maximum acceptable 95th percentile broadcast latency in milliseconds.',
      type: 'number',
      defaultDescription: '500',
    })
    .option('redis-reset-sequence', {
      describe: 'Sequence number after which to simulate a Redis reset during broadcast scenarios (0 disables).',
      type: 'number',
      defaultDescription: '0',
    })
    .option('redis-reset-delay', {
      describe: 'Delay in milliseconds before reconnecting after the simulated Redis reset.',
      type: 'number',
      defaultDescription: '1000',
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Enable verbose logging output.',
      type: 'boolean',
    })
    .option('json', {
      describe: 'Emit machine-readable JSON results alongside human-readable output.',
      type: 'boolean',
    })
    .help();

  const argv = await parser.parseAsync();

  const scenarioName = argv.scenario as string;
  const scenario = getScenario(scenarioName);
  if (!scenario) {
    logError(`Unknown scenario: ${argv.scenario}`);
    process.exitCode = 1;
    return;
  }

  const configFromFile = argv.config ? await loadHarnessConfig(argv.config) : undefined;

  if (argv.config) {
    logInfo(`Loaded defaults from config file ${argv.config}`);
  }

  const defaults = {
    apiBaseUrl: 'http://localhost:3000',
    metricsPath: '/internal/realtime/metrics',
    websocketPath: '/ws',
    connectTimeoutMs: 5000,
    disconnectTimeoutMs: 2000,
    attempts: 0,
    extras: 3,
    jobCount: 0,
    delayMs: 25,
    settleMs: 250,
    eventCount: 50,
    clientCount: 200,
    replayThresholdMs: 1000,
    latencyThresholdMs: 500,
    redisResetSequence: 0,
    redisResetDelayMs: 1000,
  } as const;

  const scenarioOptionOverrides = configFromFile?.scenarioOptions?.[scenarioName] ?? {};
  const fileConfig = configFromFile?.config ?? {};
  const fileOptions = configFromFile?.options ?? {};

  const allowedOrigin = argv.origin ?? fileConfig.allowedOrigin;
  if (!allowedOrigin) {
    logError('Origin must be provided via --origin or in the supplied config file.');
    process.exitCode = 1;
    return;
  }

  const config: HarnessConfig = {
    apiBaseUrl: coalesceString(argv['api-url'], fileConfig.apiBaseUrl) ?? defaults.apiBaseUrl,
    metricsPath: coalesceString(argv['metrics-path'], fileConfig.metricsPath) ?? defaults.metricsPath,
    websocketPath: coalesceString(argv['ws-path'], fileConfig.websocketPath) ?? defaults.websocketPath,
    allowedOrigin,
    alternateOrigin: coalesceString(argv['alternate-origin'], fileConfig.alternateOrigin),
    connectTimeoutMs: coalesceNumber(argv['connect-timeout'], fileConfig.connectTimeoutMs, defaults.connectTimeoutMs),
    disconnectTimeoutMs: coalesceNumber(
      argv['disconnect-timeout'],
      fileConfig.disconnectTimeoutMs,
      defaults.disconnectTimeoutMs,
    ),
    verbose: typeof argv.verbose === 'boolean' ? argv.verbose : fileConfig.verbose ?? false,
    redisUrl: coalesceString(argv['redis-url'], fileConfig.redisUrl),
    mongoUri: coalesceString(argv['mongo-uri'], fileConfig.mongoUri),
  };

  const options: HarnessOptions = {
    attempts: coalesceNumber(argv.attempts, scenarioOptionOverrides.attempts, fileOptions.attempts, defaults.attempts),
    extras: coalesceNumber(argv.extras, scenarioOptionOverrides.extras, fileOptions.extras, defaults.extras),
    jobCount: coalesceNumber(argv['job-count'], scenarioOptionOverrides.jobCount, fileOptions.jobCount, defaults.jobCount),
    delayMs: coalesceNumber(argv.delay, scenarioOptionOverrides.delayMs, fileOptions.delayMs, defaults.delayMs),
    settleMs: coalesceNumber(argv.settle, scenarioOptionOverrides.settleMs, fileOptions.settleMs, defaults.settleMs),
    eventCount: coalesceNumber(
      argv['event-count'],
      scenarioOptionOverrides.eventCount,
      fileOptions.eventCount,
      defaults.eventCount,
    ),
    clientCount: coalesceNumber(
      argv['client-count'],
      scenarioOptionOverrides.clientCount,
      fileOptions.clientCount,
      defaults.clientCount,
    ),
    replayThresholdMs: coalesceNumber(
      argv['replay-threshold'],
      scenarioOptionOverrides.replayThresholdMs,
      fileOptions.replayThresholdMs,
      defaults.replayThresholdMs,
    ),
    latencyThresholdMs: coalesceNumber(
      argv['latency-threshold'],
      scenarioOptionOverrides.latencyThresholdMs,
      fileOptions.latencyThresholdMs,
      defaults.latencyThresholdMs,
    ),
    redisResetSequence: coalesceNumber(
      argv['redis-reset-sequence'],
      scenarioOptionOverrides.redisResetSequence,
      fileOptions.redisResetSequence,
      defaults.redisResetSequence,
    ),
    redisResetDelayMs: coalesceNumber(
      argv['redis-reset-delay'],
      scenarioOptionOverrides.redisResetDelayMs,
      fileOptions.redisResetDelayMs,
      defaults.redisResetDelayMs,
    ),
  };

  const emitJson = argv.json === true;
  const verboseOutput = argv.verbose === true;

  logInfo(`Running scenario ${chalk.bold(scenario.name)} against ${config.apiBaseUrl}`);

  try {
    const result = await scenario.run(config, options);
    reportResult(result, emitJson, verboseOutput);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`Scenario execution failed: ${message}`);
    process.exitCode = 1;
  }
}

function reportResult(result: ScenarioResult, emitJson: boolean, verbose: boolean): void {
  if (result.success) {
    logSuccess(result.summary);
  } else {
    logError(result.summary);
    if (result.errors.length > 0) {
      for (const error of result.errors) {
        logError(`- ${error}`);
      }
    }
    process.exitCode = 1;
  }

  if (verbose) {
    logInfo('Scenario details:');
    console.dir(result.details, { depth: null, colors: true });
  }

  if (emitJson) {
    console.log('\n' + JSON.stringify(result, null, 2));
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  logError(`Unhandled failure: ${message}`);
  process.exitCode = 1;
});

function coalesceNumber(...values: Array<number | undefined>): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

function coalesceString(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return undefined;
}
