const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return [];
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

// Improved logic to find the closing > of a tag while ignoring > inside { } or strings
function findEndOfTag(content, startIndex) {
    let depth = 0;
    let inString = null;
    let i = startIndex;
    while (i < content.length) {
        let char = content[i];
        if (inString) {
            if (char === inString && content[i-1] !== '\\') inString = null;
        } else if (char === '{') {
            depth++;
        } else if (char === '}') {
            depth--;
        } else if (char === '"' || char === "'" || char === "`") {
            inString = char;
        } else if (char === '>' && depth === 0) {
            return i;
        }
        i++;
    }
    return -1;
}

const tagRegex = /<(div|motion\.div|AnimatePresence|(?:\/)(?:div|motion\.div|AnimatePresence))(?:\s|>|\/)/g;

const files = getFiles('client/src');
let totalErrors = 0;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let stack = [];
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
        let raw = match[1];
        let isClose = raw.startsWith('/');
        let tagName = isClose ? raw.substring(1) : raw;
        
        if (isClose) {
            if (stack.length === 0) {
                const line = content.substring(0, match.index).split('\n').length;
                console.log(`[ERROR] Unexpected closing tag </${tagName}> in ${file} at line ${line}`);
                totalErrors++;
            } else {
                const last = stack.pop();
                if (last.tagName !== tagName) {
                    const line = content.substring(0, match.index).split('\n').length;
                    console.log(`[MISMATCH] In ${file} at line ${line}: Closed </${tagName}>, but last opened was <${last.tagName}> at line ${last.line}`);
                    totalErrors++;
                }
            }
        } else {
            // Find if it's self-closing
            let endIndex = findEndOfTag(content, match.index);
            if (endIndex !== -1) {
                let tagFull = content.substring(match.index, endIndex + 1);
                let isSelfClosing = tagFull.trim().endsWith('/>');
                if (!isSelfClosing) {
                    const line = content.substring(0, match.index).split('\n').length;
                    stack.push({ tagName, line });
                }
            }
        }
    }
    while (stack.length > 0) {
        let last = stack.pop();
        console.log(`[UNCLOSED] tag <${last.tagName}> in ${file} opened at line ${last.line}`);
        totalErrors++;
    }
});

if (totalErrors === 0) {
    console.log("No structural tag errors found in TSX files.");
} else {
    console.log(`Found ${totalErrors} structural error(s).`);
}
