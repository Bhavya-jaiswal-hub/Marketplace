const cp = require('child_process');
const oldSRS = cp.execSync('git show a20a7fcb0d655b8fd22f4bc5961adec1d98e488d:docs/SRS.md', { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });
const lines = oldSRS.split(/\r?\n/);
const nfrLines = [];
let capture = false;
lines.forEach((l, idx) => {
  if (l.includes('# 10. Non-Functional Requirements') || l.includes('Non-Functional Requirements')) {
    capture = true;
  }
  if (capture && (l.match(/^#\s+11\./) || l.includes('# 11. Business Rules'))) {
    capture = false;
  }
  if (capture) {
    nfrLines.push(`L${idx+1}: ${l}`);
  }
});
console.log(nfrLines.slice(0, 150).join('\n'));
