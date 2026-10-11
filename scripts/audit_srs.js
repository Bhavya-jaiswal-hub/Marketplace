const fs = require('fs');
const cp = require('child_process');

const srs = fs.readFileSync('docs/SRS.md', 'utf8');
const lines = srs.split(/\r?\n/);

let curSec = 'Preamble';
const sections = {};
lines.forEach((l, idx) => {
  const m = l.match(/^#\s+(\d+\.\s+[^\r\n#]+)/);
  if (m) {
    curSec = m[1].trim();
    sections[curSec] = [];
  } else {
    if (!sections[curSec]) sections[curSec] = [];
    sections[curSec].push({ lineNum: idx + 1, text: l });
  }
});

// CHECK 2: Admin as seller, moderation, BR / C / R
console.log('==================== CHECK 2 DETAILS ====================');
['7. User Roles', '9. Functional Requirements', '11. Business Rules', '14. Constraints', '15. Risks'].forEach(s => {
  console.log(`--- ${s} ---`);
  sections[s].forEach(item => {
    if (/admin|seller|delete|takedown|suspend|revoke|commission|settlement|0%/i.test(item.text)) {
      console.log(`L${item.lineNum}: ${item.text}`);
    }
  });
});

// CHECK 3: Cancellation
console.log('\n==================== CHECK 3 DETAILS ====================');
['9. Functional Requirements', '11. Business Rules', '19. Acceptance Criteria'].forEach(s => {
  console.log(`--- ${s} ---`);
  sections[s].forEach(item => {
    if (/cancel|shipping/i.test(item.text)) {
      console.log(`L${item.lineNum}: ${item.text}`);
    }
  });
});

// CHECK 4: Returns
console.log('\n==================== CHECK 4 DETAILS ====================');
['9. Functional Requirements', '11. Business Rules', '19. Acceptance Criteria'].forEach(s => {
  console.log(`--- ${s} ---`);
  sections[s].forEach(item => {
    if (/return|refund|dispute|tax/i.test(item.text)) {
      console.log(`L${item.lineNum}: ${item.text}`);
    }
  });
});

// CHECK 5: Status names
console.log('\n==================== CHECK 5 DETAILS ====================');
const s8Text = sections['8. Status Definitions'].map(i => i.text).join('\n');
console.log('Section 8 Content:\n', s8Text);

// CHECK 6: Notifications FR-13, BR-13, AC-8
console.log('\n==================== CHECK 6 DETAILS ====================');
const fr13 = sections['9. Functional Requirements'].filter(i => i.text.includes('FR-13') || (i.lineNum >= 335 && i.lineNum <= 350));
console.log('FR-13 lines:\n', fr13.map(i => `L${i.lineNum}: ${i.text}`).join('\n'));

const br13 = sections['11. Business Rules'].filter(i => i.text.includes('BR-13') || (i.lineNum >= 475 && i.lineNum <= 495));
console.log('BR-13 lines:\n', br13.map(i => `L${i.lineNum}: ${i.text}`).join('\n'));

const ac8 = sections['19. Acceptance Criteria'].filter(i => i.text.includes('AC-8') || (i.lineNum >= 645 && i.lineNum <= 655));
console.log('AC-8 lines:\n', ac8.map(i => `L${i.lineNum}: ${i.text}`).join('\n'));

// CHECK 7: Pause, Hide, Delete
console.log('\n==================== CHECK 7 DETAILS ====================');
Object.keys(sections).forEach(s => {
  sections[s].forEach(item => {
    if (/\b(pause|paused|hide|hidden|delete|deleted|soft-delete)\b/i.test(item.text)) {
      console.log(`[${s}] L${item.lineNum}: ${item.text}`);
    }
  });
});
