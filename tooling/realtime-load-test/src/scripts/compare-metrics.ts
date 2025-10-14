import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import type { GatewayMetrics } from '../types.js';

interface MetricsSnapshotFile {
  readonly stage?: string;
  readonly capturedAt?: string;
  readonly metrics: GatewayMetrics;
}

interface DiffEntry {
  readonly path: string;
  readonly baseline?: number;
  readonly target?: number;
  readonly delta: number;
}

const parser = yargs(hideBin(process.argv))
  .scriptName('realtime-load-test compare-metrics')
  .usage('$0 --baseline <path> --target <path> [--output <path>] [--all]')
  .option('baseline', {
    alias: 'b',
    describe: 'Path to baseline metrics snapshot JSON.',
    type: 'string',
    demandOption: true,
  })
  .option('target', {
    alias: 't',
    describe: 'Path to target metrics snapshot JSON to compare against the baseline.',
    type: 'string',
    demandOption: true,
  })
  .option('output', {
    alias: 'o',
    describe: 'Optional path to write the diff report as JSON.',
    type: 'string',
  })
  .option('all', {
    describe: 'Include unchanged metrics (delta = 0) in the output.',
    type: 'boolean',
    default: false,
  })
  .strict()
  .help();

void parser.parseAsync().then(async (argv) => {
  const baselinePath = resolve(argv.baseline as string);
  const targetPath = resolve(argv.target as string);
  const includeAll = argv.all === true;
  const outputPath = typeof argv.output === 'string' ? resolve(argv.output) : undefined;

  const baselineSnapshot = await loadSnapshot(baselinePath);
  const targetSnapshot = await loadSnapshot(targetPath);

  const diff = diffMetrics(baselineSnapshot.metrics, targetSnapshot.metrics, includeAll);

  printReport({
    baselinePath,
    targetPath,
    baselineSnapshot,
    targetSnapshot,
    diff,
  });

  if (outputPath) {
    await writeJsonReport({
      baselinePath,
      targetPath,
      baselineSnapshot,
      targetSnapshot,
      diff,
      outputPath,
    });
    console.log(chalk.green(`
Diff written to ${outputPath}`));
  }
}).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`
Failed to compare metrics: ${message}`));
  process.exitCode = 1;
});

async function loadSnapshot(filePath: string): Promise<MetricsSnapshotFile> {
  const content = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(content) as MetricsSnapshotFile;

  if (!parsed || typeof parsed !== 'object' || typeof parsed.metrics !== 'object') {
    throw new Error(`Invalid metrics snapshot: ${filePath}`);
  }

  return parsed;
}

function diffMetrics(baseline: GatewayMetrics, target: GatewayMetrics, includeAll: boolean): DiffEntry[] {
  const flattenedBaseline = flattenMetrics(baseline);
  const flattenedTarget = flattenMetrics(target);

  const keys = new Set<string>([...Object.keys(flattenedBaseline), ...Object.keys(flattenedTarget)]);
  const entries: DiffEntry[] = [];

  for (const key of Array.from(keys).sort()) {
    const baselineValue = flattenedBaseline[key];
    const targetValue = flattenedTarget[key];
    const delta = (targetValue ?? 0) - (baselineValue ?? 0);

    if (!includeAll && delta === 0) {
      continue;
    }

    entries.push({
      path: key,
      baseline: baselineValue,
      target: targetValue,
      delta,
    });
  }

  return entries;
}

function flattenMetrics(metrics: GatewayMetrics): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value === 'number') {
      result[key] = value;
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (key === 'lastCatchUp') {
        for (const [jobId, catchUp] of Object.entries(value)) {
          if (!catchUp || typeof catchUp !== 'object') {
            continue;
          }
          for (const [catchKey, catchValue] of Object.entries(catchUp)) {
            if (typeof catchValue === 'number') {
              result[`${key}.${jobId}.${catchKey}`] = catchValue;
            }
          }
        }
        continue;
      }

      for (const [childKey, childValue] of Object.entries(value)) {
        if (typeof childValue === 'number') {
          result[`${key}.${childKey}`] = childValue;
        }
      }
    }
  }

  return result;
}

function printReport({
  baselinePath,
  targetPath,
  baselineSnapshot,
  targetSnapshot,
  diff,
}: {
  baselinePath: string;
  targetPath: string;
  baselineSnapshot: MetricsSnapshotFile;
  targetSnapshot: MetricsSnapshotFile;
  diff: DiffEntry[];
}): void {
  console.log(chalk.cyan('\nRealtime Gateway Metrics Diff'));
  console.log(chalk.gray('='.repeat(34)));
  console.log(`${chalk.gray('Baseline:')} ${baselinePath}`);
  if (baselineSnapshot.stage) {
    console.log(`${chalk.gray('  Stage:')} ${baselineSnapshot.stage}`);
  }
  if (baselineSnapshot.capturedAt) {
    console.log(`${chalk.gray('  Captured:')} ${baselineSnapshot.capturedAt}`);
  }

  console.log(`\n${chalk.gray('Target:')} ${targetPath}`);
  if (targetSnapshot.stage) {
    console.log(`${chalk.gray('  Stage:')} ${targetSnapshot.stage}`);
  }
  if (targetSnapshot.capturedAt) {
    console.log(`${chalk.gray('  Captured:')} ${targetSnapshot.capturedAt}`);
  }

  if (diff.length === 0) {
    console.log(chalk.green('\nNo metric deltas detected.'));
    return;
  }

  console.log(`\n${chalk.gray('Changes:')}`);
  for (const entry of diff) {
    const { path, baseline, target, delta } = entry;
    const deltaColor = delta > 0 ? chalk.green : delta < 0 ? chalk.red : chalk.gray;
    const formattedDelta = deltaColor(delta.toString());
    const formattedBaseline = baseline ?? chalk.gray('∅');
    const formattedTarget = target ?? chalk.gray('∅');

    console.log(`  ${chalk.white(path)}: ${formattedBaseline} → ${formattedTarget} (${formattedDelta})`);
  }
}

async function writeJsonReport({
  baselinePath,
  targetPath,
  baselineSnapshot,
  targetSnapshot,
  diff,
  outputPath,
}: {
  baselinePath: string;
  targetPath: string;
  baselineSnapshot: MetricsSnapshotFile;
  targetSnapshot: MetricsSnapshotFile;
  diff: DiffEntry[];
  outputPath: string;
}): Promise<void> {
  const payload = {
    generatedAt: new Date().toISOString(),
    baseline: {
      path: baselinePath,
      stage: baselineSnapshot.stage,
      capturedAt: baselineSnapshot.capturedAt,
    },
    target: {
      path: targetPath,
      stage: targetSnapshot.stage,
      capturedAt: targetSnapshot.capturedAt,
    },
    changes: diff,
  };

  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf-8');
}
