const fs = require('fs');
const content = fs.readFileSync('client/src/pages/EmployeeProfile.tsx', 'utf8');

// Regex to match opening and closing tags for div, motion.div, and AnimatePresence
// Improved to handle self-closing tags and ignore other motion components
const tagRegex = /<(div|motion\.div|AnimatePresence|(?:\/)(?:div|motion\.div|AnimatePresence))(?:\s|>|\/)/g;
let stack = [];
let match;

while ((match = tagRegex.exec(content)) !== null) {
    let raw = match[0];
    let isClose = raw.startsWith('</');
    let tagName = match[1].replace('/', '');
    let isSelfClosing = raw.endsWith('/>') || content.substring(match.index, content.indexOf('>', match.index) + 1).endsWith('/>');
    
    if (isSelfClosing && !isClose) {
        // console.log(`Self-closing ${tagName} at line ${content.substring(0, match.index).split('\n').length}`);
        continue;
    }

    const offset = match.index;
    const line = content.substring(0, offset).split('\n').length;

    if (isClose) {
        if (stack.length === 0) {
            console.log(`Unexpected close tag ${tagName} at line ${line}`);
        } else {
            const last = stack.pop();
            if (last.tagName !== tagName) {
                console.log(`Mismatch at line ${line}: Closed ${tagName}, but last opened was ${last.tagName} at line ${last.line}`);
            }
        }
    } else {
        stack.push({ tagName, line });
    }
}

console.log('Remaining on stack:', stack);
