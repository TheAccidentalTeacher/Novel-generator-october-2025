#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

import { ensurePreview } from './utils/preview-server.mjs';

const DEFAULT_BASE_URL = process.env.RESPONSIVE_BASE_URL ?? 'http://127.0.0.1:4173/';
const PAGES = [
  { name: 'job-list', path: '/jobs' },
  { name: 'job-detail-placeholder', path: '/jobs/demo-placeholder' },
];
const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'tablet', width: 1024, height: 1366 },
];

async function main() {
  const preview = await ensurePreview({ baseUrl: DEFAULT_BASE_URL });
  const baseUrl = preview.baseUrl ?? DEFAULT_BASE_URL;

  if (preview.alreadyRunning) {
    console.log(`Using existing preview at ${baseUrl}`);
  } else {
    console.log(`Started preview at ${baseUrl}`);
  }

  await mkdir('docs/ui/responsive', { recursive: true });
  const browser = await chromium.launch();
  const results = [];

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    for (const target of PAGES) {
  const url = new URL(target.path, baseUrl).toString();
      console.log(`Checking ${target.name} at ${viewport.label} (${viewport.width}x${viewport.height})`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(500);

      const title = await page.title();
      const screenshotPath = `docs/ui/responsive/${target.name}-${viewport.label}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      results.push({
        page: target.name,
        viewport: viewport.label,
        title,
        screenshotPath,
        scrollHeight,
      });
      console.log(`  Saved screenshot to ${screenshotPath}`);
    }

    await context.close();
  }

  await browser.close();

  console.log('\nResponsive check summary:');
  for (const entry of results) {
    console.log(`- ${entry.page} @ ${entry.viewport}: ${entry.scrollHeight}px tall → ${entry.screenshotPath}`);
  }

  if (!preview.alreadyRunning) {
    await preview.stop();
  }
}

main().catch((error) => {
  console.error('Responsive check failed:', error);
  process.exitCode = 1;
});
