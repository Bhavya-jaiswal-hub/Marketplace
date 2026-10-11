const fs = require('fs');
const cp = require('child_process');

const oldSRS = cp.execSync('git show a20a7fcb0d655b8fd22f4bc5961adec1d98e488d:docs/SRS.md', { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });

const missingIDs = [
  'BR-14', 'BR-15', 'BR-16',
  'AC-9', 'AC-10',
  'AS-11', 'AS-12', 'AS-13', 'AS-14',
  'C-7', 'C-8', 'C-9', 'C-10',
  'R-6', 'R-7', 'R-8',
  'NFR-8', 'NFR-9', 'NFR-10', 'NFR-11', 'NFR-12', 'NFR-13', 'NFR-14', 'NFR-15'
];

const lines = oldSRS.split(/\r?\n/);
missingIDs.forEach(id => {
  const lineIdx = lines.findIndex(l => l.includes(id));
  if (lineIdx !== -1) {
    console.log(`=== OLD ${id} (line ${lineIdx + 1}) ===`);
    console.log(lines.slice(lineIdx, lineIdx + 10).join('\n'));
  }
});
