#!/usr/bin/env ts-node
import { promises as fs } from 'fs';
import path from 'path';

type EnvCheckResult = {
  docVariables: Set<string>;
  envVariables: Map<string, Set<string>>;
  extraEnvVariables: Array<{ file: string; variable: string }>;
  missingDocVariables: string[];
};

const DOC_ONLY_VARIABLES = new Set<string>(['RAILWAY_PROJECT_ID']);

async function findEnvExampleFiles(root: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.name.startsWith('.git') ||
        entry.name === 'node_modules' ||
        entry.name === 'legacy'
      ) {
        continue;
      }
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (entry.isFile() && entry.name === '.env.example') {
        results.push(entryPath);
      }
    }
  }

  await walk(root);
  return results;
}

function parseDocVariables(markdown: string): Set<string> {
  const regex = /^\|\s*`([^`]+)`\s*\|/gm;
  const variables = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    variables.add(match[1]);
  }
  return variables;
}

function parseEnvFile(content: string): Set<string> {
  const variables = new Set<string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const sanitized = line.startsWith('export ')
      ? line.slice('export '.length)
      : line;
    const [variable] = sanitized.split('=', 1);
    if (variable) {
      variables.add(variable.trim());
    }
  }
  return variables;
}

async function checkEnvironmentAlignment(root: string): Promise<EnvCheckResult> {
  const docsRefPath = path.join(root, 'docs', 'config', 'environment-reference.md');
  const docContents = await fs.readFile(docsRefPath, 'utf8');
  const docVariables = parseDocVariables(docContents);

  const envExampleFiles = await findEnvExampleFiles(root);
  const envVariables = new Map<string, Set<string>>();
  const extraEnvVariables: Array<{ file: string; variable: string }> = [];
  const unionEnvVariables = new Set<string>();

  for (const filePath of envExampleFiles) {
    const contents = await fs.readFile(filePath, 'utf8');
    const variables = parseEnvFile(contents);
    envVariables.set(filePath, variables);
    for (const variable of variables) {
      unionEnvVariables.add(variable);
      if (!docVariables.has(variable)) {
        extraEnvVariables.push({ file: path.relative(root, filePath), variable });
      }
    }
  }

  const missingDocVariables = Array.from(docVariables).filter(
    (variable) => !unionEnvVariables.has(variable) && !DOC_ONLY_VARIABLES.has(variable)
  );

  return { docVariables, envVariables, extraEnvVariables, missingDocVariables };
}

async function main() {
  const root = process.cwd();
  const {
    docVariables,
    envVariables,
    extraEnvVariables,
    missingDocVariables
  } = await checkEnvironmentAlignment(root);

  let hasErrors = false;

  if (extraEnvVariables.length > 0) {
    hasErrors = true;
    console.error('❌ The following environment variables are defined but not documented:');
    for (const { file, variable } of extraEnvVariables) {
      console.error(`   - ${variable} (in ${file})`);
    }
  }

  if (missingDocVariables.length > 0) {
    hasErrors = true;
    console.error('❌ The following documented variables are missing from .env.example files:');
    for (const variable of missingDocVariables) {
      console.error(`   - ${variable}`);
    }
  }

  if (!hasErrors) {
    console.log('✅ Environment references and .env.example files are aligned.');
  } else {
    console.error(`
Documented variables (${docVariables.size}): ${Array.from(docVariables).join(', ')}`);
    console.error(
      `Encountered across .env.example files (${envVariables.size} files).`
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Environment alignment check failed with an unexpected error.');
  console.error(error);
  process.exitCode = 1;
});
