import { defineConfig, devices } from '@playwright/test';

const defaultHost = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const defaultPort = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? '4173', 10);
const baseURL = process.env.WEB_BASE_URL ?? `http://${defaultHost}:${defaultPort}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
	testDir: './tests/e2e',
	testMatch: /.*\.spec\.ts$/,
	timeout: 60_000,
	expect: {
		timeout: 5_000
	},
	fullyParallel: true,
	reporter: [['list'], ...(isCI ? [['github']] : [])],
	use: {
		baseURL,
		headless: true,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command: `pnpm --filter @letswriteabook/web run preview --host ${defaultHost} --port ${defaultPort}`,
		url: baseURL,
		reuseExistingServer: !isCI,
		timeout: 120_000
	}
});
