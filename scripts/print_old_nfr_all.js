const cp = require('child_process');
const oldSRS = cp.execSync('git show a20a7fcb0d655b8fd22f4bc5961adec1d98e488d:docs/SRS.md', { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });
const lines = oldSRS.split(/\r?\n/);
let inNFR = false;
lines.forEach((l, idx) => {
  if (l.includes('NFR-1') || l.includes('Non-Functional Requirements')) {
    inNFR = true;
  }
  if (inNFR && (l.includes('# 11. Business Rules') || l.includes('Business Rules'))) {
    if (idx > 500) inNFR = false;
  }
  if (inNFR && idx > 450 && idx < 700) {
    console.log(`L${idx+1}: ${l}`);
  }
});
