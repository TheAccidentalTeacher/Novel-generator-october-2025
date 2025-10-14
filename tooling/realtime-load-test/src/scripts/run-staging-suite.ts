import { promises as fs } from 'node:fs';
import { resolve, join } from 'node:path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { loadHarnessConfig } from '../config-file.js';
import { fetchGatewayMetrics, MetricsUnavailableError } from '../metrics.js';
import { getScenario } from '../scenarios/index.js';
import type {
  GatewayMetrics,
  HarnessConfig,
  HarnessOptions,
  ScenarioResult,
} from '../types.js';
import { logError, logInfo, logSuccess, logWarn } from '../utils/log.js';

interface SuiteResult {
  readonly scenario: string;
  readonly outputPath: string;
  readonly success: boolean;
  readonly summary: string;
}

interface MetricsSnapshotSummary {
  readonly stage: string;
  readonly outputPath: string;
  readonly success: boolean;
  readonly recordedAt?: string;
  readonly error?: string;
}

const SUITE_SCENARIOS = ['catch-up-burst', 'broadcast-burst'] as const;

const parser = yargs(hideBin(process.argv))
  .scriptName('realtime-load-test suite')
  .usage('$0 --config <path> [--output <dir>] [--label <slug>]')
  .option('config', {
    alias: 'c',
    describe: 'Path to JSON config file with shared defaults.',
    type: 'string',
    demandOption: true,
  })
  .option('output', {
    alias: 'o',
    describe: 'Directory to store JSON results. Created if missing.',
    type: 'string',
  })
  .option('label', {
    alias: 'l',
    describe: 'Optional label inserted into output filenames.',
    type: 'string',
  })
  .option('skip-redis-reset', {
    describe: 'Disable redis reset simulation even if defined in config.',
    type: 'boolean',
    default: false,
  })
  .strict()
  .help();

void parser.parseAsync().then(async (argv) => {
  const configPath = resolve(argv.config as string);
  const outputDir = resolve(
    typeof argv.output === 'string' && argv.output.length > 0
      ? argv.output
      : join('docs', 'qa', 'load-test-reports', new Date().toISOString().substring(0, 10)),
  );
  const label = typeof argv.label === 'string' && argv.label.length > 0 ? sanitizeLabel(argv.label) : undefined;
  const skipRedisReset = argv['skip-redis-reset'] === true;

  const { config: fileConfig, options: fileOptions, scenarioOptions } = await loadHarnessConfig(configPath);

  const defaults = getDefaultConfig();

  const allowedOrigin = fileConfig.allowedOrigin;
  if (!allowedOrigin) {
    throw new Error('Config file must specify an "origin" value.');
  }

  const harnessConfig: HarnessConfig = {
    apiBaseUrl: fileConfig.apiBaseUrl ?? defaults.apiBaseUrl,
    metricsPath: fileConfig.metricsPath ?? defaults.metricsPath,
    websocketPath: fileConfig.websocketPath ?? defaults.websocketPath,
    allowedOrigin,
    alternateOrigin: fileConfig.alternateOrigin,
    connectTimeoutMs: fileConfig.connectTimeoutMs ?? defaults.connectTimeoutMs,
    disconnectTimeoutMs: fileConfig.disconnectTimeoutMs ?? defaults.disconnectTimeoutMs,
    verbose: fileConfig.verbose ?? false,
    redisUrl: fileConfig.redisUrl,
    mongoUri: fileConfig.mongoUri,
  };

  const baseOptions: HarnessOptions = {
    attempts: fileOptions.attempts ?? defaults.attempts,
    extras: fileOptions.extras ?? defaults.extras,
    jobCount: fileOptions.jobCount ?? defaults.jobCount,
    delayMs: fileOptions.delayMs ?? defaults.delayMs,
    settleMs: fileOptions.settleMs ?? defaults.settleMs,
    eventCount: fileOptions.eventCount ?? defaults.eventCount,
    clientCount: fileOptions.clientCount ?? defaults.clientCount,
    replayThresholdMs: fileOptions.replayThresholdMs ?? defaults.replayThresholdMs,
    latencyThresholdMs: fileOptions.latencyThresholdMs ?? defaults.latencyThresholdMs,
    redisResetSequence: skipRedisReset ? 0 : fileOptions.redisResetSequence ?? defaults.redisResetSequence,
    redisResetDelayMs: fileOptions.redisResetDelayMs ?? defaults.redisResetDelayMs,
  };

  await fs.mkdir(outputDir, { recursive: true });
  logInfo(`Writing suite artifacts to ${outputDir}`);

  const suiteResults: SuiteResult[] = [];
  const metricsSnapshots: MetricsSnapshotSummary[] = [];
  let hasFailure = false;

  metricsSnapshots.push(
    ...(await captureMetricsSnapshot({
      stage: 'before-suite',
      config: harnessConfig,
      directory: outputDir,
      label,
    })),
  );

  for (const scenarioName of SUITE_SCENARIOS) {
    const scenario = getScenario(scenarioName);
    if (!scenario) {
      logWarn(`Scenario ${scenarioName} not registered; skipping.`);
      continue;
    }

    const overrides = scenarioOptions[scenarioName] ?? {};
    const options: HarnessOptions = {
      ...baseOptions,
      ...overrides,
      redisResetSequence: skipRedisReset
        ? 0
        : overrides.redisResetSequence ?? baseOptions.redisResetSequence,
      redisResetDelayMs: overrides.redisResetDelayMs ?? baseOptions.redisResetDelayMs,
    };

    const outputFileName = buildOutputFilename({
      scenario: scenarioName,
      label,
    });
    const outputPath = join(outputDir, outputFileName);

    logInfo(`Executing ${scenarioName} scenario...`);

    let result: ScenarioResult;
    try {
      result = await scenario.run(harnessConfig, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logError(`Scenario ${scenarioName} threw an error: ${message}`);
      result = {
        scenario: scenarioName,
        success: false,
        summary: `Scenario execution failed: ${message}`,
        details: {},
        errors: [message],
      };
    }

    await writeScenarioResult(outputPath, result, options);

    suiteResults.push({
      scenario: scenarioName,
      outputPath,
      success: result.success,
      summary: result.summary,
    });

    if (result.success) {
      logSuccess(result.summary);
    } else {
      hasFailure = true;
      logWarn(result.summary);
      if (result.errors.length > 0) {
        for (const error of result.errors) {
          logWarn(` - ${error}`);
        }
      }
    }

    metricsSnapshots.push(
      ...(await captureMetricsSnapshot({
        stage: `after-${scenarioName}`,
        config: harnessConfig,
        directory: outputDir,
        label,
      })),
    );
  }

  metricsSnapshots.push(
    ...(await captureMetricsSnapshot({
      stage: 'after-suite',
      config: harnessConfig,
      directory: outputDir,
      label,
    })),
  );

  await writeSuiteSummary(outputDir, suiteResults, metricsSnapshots);

  if (hasFailure) {
    logError('Suite completed with failures.');
    process.exitCode = 1;
  } else {
    logSuccess('Suite completed successfully.');
  }
}).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  logError(`Suite execution failed: ${message}`);
  process.exitCode = 1;
});

function getDefaultConfig(): HarnessConfig & HarnessOptions {
  return {
    apiBaseUrl: 'http://localhost:3000',
    metricsPath: '/internal/realtime/metrics',
    websocketPath: '/ws',
    allowedOrigin: 'http://localhost:5173',
    connectTimeoutMs: 5000,
    disconnectTimeoutMs: 2000,
    verbose: false,
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
  } satisfies HarnessConfig & HarnessOptions;
}

async function writeScenarioResult(path: string, result: ScenarioResult, options: HarnessOptions): Promise<void> {
  const payload = {
    executedAt: new Date().toISOString(),
    options,
    ...result,
  };
  await fs.writeFile(path, JSON.stringify(payload, null, 2), 'utf-8');
}

async function writeSuiteSummary(
  directory: string,
  results: SuiteResult[],
  metricsSnapshots: MetricsSnapshotSummary[],
): Promise<void> {
  const summaryPath = join(directory, 'suite-summary.json');
  const payload = {
    executedAt: new Date().toISOString(),
    results,
    success: results.every((result) => result.success),
    metricsSnapshots,
  };
  await fs.writeFile(summaryPath, JSON.stringify(payload, null, 2), 'utf-8');
}

function sanitizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
}

function buildOutputFilename({ scenario, label }: { scenario: string; label?: string }): string {
  const sanitizedScenario = scenario.replace(/[^a-z0-9-]+/g, '-');
  if (label) {
    return `${label}-${sanitizedScenario}.json`;
  }
  return `${sanitizedScenario}.json`;
}

async function captureMetricsSnapshot({
  stage,
  config,
  directory,
  label,
}: {
  stage: string;
  config: HarnessConfig;
  directory: string;
  label?: string;
}): Promise<MetricsSnapshotSummary[]> {
  const filename = buildMetricsFilename({ stage, label });
  const outputPath = join(directory, filename);
  const snapshots: MetricsSnapshotSummary[] = [];

  try {
    const metrics = await fetchGatewayMetrics(config);
    const capturedAt = await writeMetricsSnapshot(outputPath, stage, metrics);
    snapshots.push({
      stage,
      outputPath,
      success: true,
      recordedAt: capturedAt,
    });
    logSuccess(`Captured gateway metrics for stage "${stage}"`);
  } catch (error) {
    const message = buildMetricsErrorMessage(error);
    logWarn(`Unable to capture gateway metrics for stage "${stage}": ${message}`);
    snapshots.push({
      stage,
      outputPath,
      success: false,
      error: message,
    });
  }

  return snapshots;
}

function buildMetricsFilename({ stage, label }: { stage: string; label?: string }): string {
  const sanitizedStage = stage.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  if (label) {
    return `${label}-${sanitizedStage}-metrics.json`;
  }
  return `${sanitizedStage}-metrics.json`;
}

async function writeMetricsSnapshot(path: string, stage: string, metrics: GatewayMetrics): Promise<string> {
  const capturedAt = new Date().toISOString();
  const payload = {
    stage,
    capturedAt,
    metrics,
  };
  await fs.writeFile(path, JSON.stringify(payload, null, 2), 'utf-8');
  return capturedAt;
}

function buildMetricsErrorMessage(error: unknown): string {
  if (error instanceof MetricsUnavailableError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
