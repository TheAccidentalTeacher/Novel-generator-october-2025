import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 4173;
const WAIT_TIMEOUT_MS = 30000;
const WAIT_INTERVAL_MS = 500;

export async function ensurePreview({ host = DEFAULT_HOST, port = DEFAULT_PORT, baseUrl } = {}) {
  const targetUrl = normalizeUrl(baseUrl ?? `http://${host}:${port}/`);

  if (await isServerUp(targetUrl)) {
    return {
      baseUrl: targetUrl,
      stop: async () => {},
      alreadyRunning: true
    };
  }

  const controller = launchPreviewProcess({ host, port });

  try {
    await waitForServer(targetUrl);
  } catch (error) {
    await controller.stop();
    throw error;
  }

  return {
    baseUrl: targetUrl,
    stop: controller.stop,
    alreadyRunning: false
  };
}

async function isServerUp(url) {
  try {
    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await isServerUp(url)) {
      return;
    }
    await sleep(WAIT_INTERVAL_MS);
  }

  throw new Error(`Preview at ${url} not ready after ${WAIT_TIMEOUT_MS / 1000}s`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUrl(url) {
  try {
    const normalized = new URL(url);
    if (!normalized.pathname || normalized.pathname === '/') {
      normalized.pathname = '/';
    }
    return normalized.toString();
  } catch {
    return url;
  }
}

function launchPreviewProcess({ host, port }) {
  const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const args = [
    '--filter',
    '@letswriteabook/web',
    'preview',
    '--host',
    host,
    '--port',
    String(port)
  ];

  console.log(`[preview-server] Starting pnpm ${args.join(' ')}`);
  const child = spawn('pnpm', args, {
    cwd: workspaceRoot,
    stdio: 'pipe',
    shell: process.platform === 'win32'
  });

  child.stdout?.on('data', (data) => {
    process.stdout.write(`[preview-server] ${data}`);
  });
  child.stderr?.on('data', (data) => {
    process.stderr.write(`[preview-server] ${data}`);
  });

  const stop = async () => {
    if (child.killed) {
      return;
    }

    child.kill();
    await Promise.race([
      once(child, 'exit'),
      once(child, 'close')
    ]).catch(() => undefined);
  };

  return { stop };
}
