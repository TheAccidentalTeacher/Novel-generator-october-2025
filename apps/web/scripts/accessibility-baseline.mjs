#!/usr/bin/env node
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

import { ensurePreview } from './utils/preview-server.mjs';

const TARGETS = [
  { name: 'Job List', path: '/jobs' },
  { name: 'Job Detail Placeholder', path: '/jobs/demo-placeholder' },
];

async function run() {
  const preview = await ensurePreview();
  const baseUrl = preview.baseUrl;

  if (preview.alreadyRunning) {
    console.log(`Using existing preview at ${baseUrl}`);
  } else {
    console.log(`Started preview at ${baseUrl}`);
  }
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const report = [];

  for (const target of TARGETS) {
    const url = new URL(target.path, baseUrl).toString();
    console.log(`\nRunning axe on ${target.name} (${url})`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(500);

      const currentUrl = page.url();
      const title = await page.title();
      const langAttr = await page.evaluate(() => document.documentElement.getAttribute('lang'));
      console.log(`  Debug: url=${currentUrl}, title=${title || '<empty>'}, lang=${langAttr || '<missing>'}`);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const violations = results.violations ?? [];
      if (violations.length === 0) {
        console.log('  ✅ No WCAG A/AA violations detected.');
      } else {
        console.log(`  ❌ Found ${violations.length} violations:`);
        for (const violation of violations) {
          console.log(`    • ${violation.id} – ${violation.description}`);
          for (const node of violation.nodes ?? []) {
            console.log(`      ↳ Target: ${node.target.join(' ')}`);
            if (node.failureSummary) {
              console.log(`        ${node.failureSummary}`);
            }
          }
        }
      }

      report.push({ name: target.name, url, violations });
    } catch (error) {
      console.error(`  ⚠️  Failed to scan ${url}:`, error.message ?? error);
      report.push({ name: target.name, url, error: error.message ?? String(error) });
    }
  }

  await browser.close();
  if (!preview.alreadyRunning) {
    await preview.stop();
  }

  console.log('\nAccessibility baseline summary:');
  for (const entry of report) {
    if (entry.error) {
      console.log(`- ${entry.name}: ERROR – ${entry.error}`);
    } else if ((entry.violations ?? []).length === 0) {
      console.log(`- ${entry.name}: PASS (no violations)`);
    } else {
      console.log(`- ${entry.name}: ${entry.violations.length} violation(s)`);
    }
  }

  const hasViolations = report.some((entry) => (entry.violations ?? []).length > 0);
  process.exitCode = hasViolations ? 1 : 0;
}

run().catch((error) => {
  console.error('Unexpected error while running accessibility baseline:', error);
  process.exitCode = 1;
});

