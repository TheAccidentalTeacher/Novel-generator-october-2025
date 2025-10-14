#!/usr/bin/env node
/*
 Simple pre-commit secret scanner to prevent committing obvious secrets.
 Scans staged text files for common credential patterns. Exits non-zero on hit.
*/
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = process.cwd();

function getStagedFiles() {
  const out = execSync('git diff --cached --name-only', { encoding: 'utf8' });
  return out
    .split(/\r?\n/)
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => fs.existsSync(path.join(repoRoot, f)));
}

// Common high-signal patterns (not exhaustive)
const patterns = [
  { name: 'OpenAI key', re: /sk-(live|proj|test)-[A-Za-z0-9_-]{20,}/ },
  { name: 'MongoDB URI with password', re: /mongodb(\+srv)?:\/\/[^:\s]+:[^@\s]+@/i },
  { name: 'Redis URL with password', re: /rediss?:\/\/[^:\s]+:[^@\s]+@/i },
  { name: 'GitHub PAT', re: /ghp_[A-Za-z0-9]{36,}/ },
  { name: 'AWS Secret Access Key', re: /aws_secret_access_key\s*=\s*[^\s]+/i },
  { name: 'Generic API key kv', re: /api[_-]?key\s*[:=]\s*[A-Za-z0-9._-]{20,}/i },
];

// Ignore list for files that may contain placeholders or non-secret examples
const ignoreFiles = new Set([
  '.env.secure',
  '.env.backup',
]);

function shouldIgnorePath(rel) {
  // Ignore legacy and docs folders which may contain example placeholders
  if (rel.startsWith('legacy/')) return true;
  if (rel.startsWith('docs/')) return true;
  return ignoreFiles.has(path.basename(rel));
}

const staged = getStagedFiles();
const hits = [];

for (const rel of staged) {
  if (shouldIgnorePath(rel)) continue;

  // Best effort: skip obvious binaries by extension
  if (/\.(png|jpg|jpeg|gif|webp|ico|bmp|pdf|zip|gz|7z|woff2?|ttf)$/i.test(rel)) continue;

  const content = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
  for (const { name, re } of patterns) {
    const match = content.match(re);
    if (match) {
      // Redact match for terminal output
      const redacted = match[0].slice(0, 6) + '…' + match[0].slice(-4);
      hits.push({ file: rel, rule: name, sample: redacted });
      break; // report one rule per file for brevity
    }
  }
}

if (hits.length > 0) {
  console.error('\n[secret-scan] Potential secrets detected in staged files:');
  for (const h of hits) {
    console.error(` - ${h.file}  (${h.rule})  e.g., ${h.sample}`);
  }
  console.error('\nCommit aborted. Move real secrets into a private, git-ignored file (e.g., .env.secure) or your CI/CD env.');
  process.exit(1);
}

process.exit(0);
