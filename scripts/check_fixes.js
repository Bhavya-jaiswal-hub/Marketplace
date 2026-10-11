const fs = require('fs');
const cp = require('child_process');

const srs = fs.readFileSync('docs/SRS.md', 'utf8');
const lines = srs.split(/\r?\n/);

console.log('=== CARRIER MATCHES ===');
lines.forEach((l, idx) => {
  if (/carrier/i.test(l)) {
    console.log(`L${idx + 1}: ${l}`);
  }
});

console.log('\n=== SECTION 8 ===');
const s8Idx = lines.findIndex(l => l.includes('# 8. Status Definitions'));
const s9Idx = lines.findIndex(l => l.includes('# 9. Functional Requirements'));
console.log(lines.slice(s8Idx, s9Idx).join('\n'));

console.log('\n=== CURRENT NFRs ===');
const s10Idx = lines.findIndex(l => l.includes('# 10. Non-Functional Requirements'));
const s11Idx = lines.findIndex(l => l.includes('# 11. Business Rules'));
console.log(lines.slice(s10Idx, s11Idx).join('\n'));

console.log('\n=== ORIGINAL NFRs (from commit a20a7fc) ===');
const oldSRS = cp.execSync('git show a20a7fcb0d655b8fd22f4bc5961adec1d98e488d:docs/SRS.md', { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });
const oldLines = oldSRS.split(/\r?\n/);
const oldS10Idx = oldLines.findIndex(l => l.includes('# 10. Non-Functional Requirements'));
const oldS11Idx = oldLines.findIndex(l => l.includes('# 11. Business Rules') || l.includes('# 11.'));
console.log(oldLines.slice(oldS10Idx, oldS11Idx).join('\n'));
