#!/usr/bin/env node

const fs = require('fs');

const migrationFiles = process.argv.slice(2);
const destructivePatterns = [
  { label: 'DROP TABLE', regex: /\bDROP\s+TABLE\b/i },
  { label: 'DROP COLUMN', regex: /\bDROP\s+COLUMN\b/i },
  { label: 'TRUNCATE', regex: /\bTRUNCATE\b/i },
  { label: 'DELETE FROM', regex: /\bDELETE\s+FROM\b/i },
];

const findings = [];

for (const filepath of migrationFiles) {
  if (!filepath || !fs.existsSync(filepath)) continue;
  const lines = fs.readFileSync(filepath, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of destructivePatterns) {
      if (pattern.regex.test(line)) {
        findings.push(`${filepath}:${index + 1} ${pattern.label}`);
      }
    }
  });
}

if (findings.length > 0) {
  console.error('Destructive database migration statements detected:');
  findings.forEach(finding => console.error(`- ${finding}`));
  console.error('Use an additive migration and a separately reviewed, backup-first data migration plan.');
  process.exit(1);
}

console.log(`Migration safety check passed for ${migrationFiles.length} changed file(s).`);
