const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(file));
        } else if (file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const tagRegex = /<(div|motion\.div|AnimatePresence|(?:\/)(?:div|motion\.div|AnimatePresence))(?:\s|>|\/)/g;

const files = getFiles('client/src');
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let stack = [];
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
        let raw = match[0];
        let isClose = raw.startsWith('</');
        let tagName = match[1].replace('/', '');
        let isSelfClosing = raw.endsWith('/>') || content.substring(match.index, content.indexOf('>', match.index) + 1).endsWith('/>');
        
        if (isSelfClosing && !isClose) continue;

        if (isClose) {
            if (stack.length === 0) {
                // Ignore unexpected closes as they might be false positives from complex regex, 
                // but usually they are errors.
            } else {
                const last = stack.pop();
                if (last.tagName !== tagName) {
                    const line = content.substring(0, match.index).split('\n').length;
                    console.log(`Mismatch in ${file} at line ${line}: Closed ${tagName}, but last opened was ${last.tagName} at line ${last.line}`);
                }
            }
        } else {
            const line = content.substring(0, match.index).split('\n').length;
            stack.push({ tagName, line });
        }
    }
    if (stack.length > 0) {
        // console.log(`Unclosed tags in ${file}:`, stack);
    }
});
