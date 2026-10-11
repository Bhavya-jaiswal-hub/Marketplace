const fs = require('fs');
const cp = require('child_process');

const oldSRS = cp.execSync('git show a20a7fcb0d655b8fd22f4bc5961adec1d98e488d:docs/SRS.md', { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });
const curSRS = fs.readFileSync('docs/SRS.md', 'utf8');

function extractIDs(text) {
  const ids = {
    FR: [],
    BR: [],
    UC: [],
    AC: [],
    AS: [],
    C: [],
    R: [],
    NFR: []
  };
  
  const lines = text.split(/\r?\n/);
  lines.forEach((l, idx) => {
    // Match FR-1, FR-01, etc.
    const fr = l.match(/\b(FR-\d+)\b/);
    if (fr && !ids.FR.includes(fr[1])) ids.FR.push(fr[1]);

    // Match BR-1, BR-01, etc.
    const br = l.match(/\b(BR-\d+)\b/);
    if (br && !ids.BR.includes(br[1])) ids.BR.push(br[1]);

    // Match UC-
    const uc = l.match(/\b(UC-[A-Z]+-\d+)\b/);
    if (uc && !ids.UC.includes(uc[1])) ids.UC.push(uc[1]);

    // Match AC-1, AC-01, etc.
    const ac = l.match(/\b(AC-\d+)\b/);
    if (ac && !ids.AC.includes(ac[1])) ids.AC.push(ac[1]);

    // Match AS-1, AS-01, etc.
    const asMatch = l.match(/\b(AS-\d+)\b/);
    if (asMatch && !ids.AS.includes(asMatch[1])) ids.AS.push(asMatch[1]);

    // Match C-1, C-01, etc.
    const cMatch = l.match(/\b(C-\d+)\b/);
    if (cMatch && !ids.C.includes(cMatch[1])) ids.C.push(cMatch[1]);

    // Match R-1, R-01, etc.
    const rMatch = l.match(/\b(R-\d+)\b/);
    if (rMatch && !ids.R.includes(rMatch[1])) ids.R.push(rMatch[1]);

    // Match NFR-1, etc.
    const nfr = l.match(/\b(NFR-\d+)\b/);
    if (nfr && !ids.NFR.includes(nfr[1])) ids.NFR.push(nfr[1]);
  });
  return ids;
}

const oldIDs = extractIDs(oldSRS);
const curIDs = extractIDs(curSRS);

console.log('OLD IDs:', JSON.stringify(oldIDs, null, 2));
console.log('CUR IDs:', JSON.stringify(curIDs, null, 2));

// Compare
for (const key of Object.keys(oldIDs)) {
  const missing = oldIDs[key].filter(id => !curIDs[key].includes(id));
  const added = curIDs[key].filter(id => !oldIDs[key].includes(id));
  console.log(`\n=== Category ${key} ===`);
  console.log(`Old Count: ${oldIDs[key].length}, Cur Count: ${curIDs[key].length}`);
  console.log(`Missing in Cur: ${missing.join(', ') || 'None'}`);
  console.log(`Added in Cur: ${added.join(', ') || 'None'}`);
}
