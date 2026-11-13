const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const markdownFiles = ['README.md', 'AGENTS.md'].filter((file) => fs.existsSync(path.join(root, file)));

function collectMarkdown(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectMarkdown(entryPath);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      markdownFiles.push(path.relative(root, entryPath));
    }
  }
}

const docsDirectory = path.join(root, 'docs');
if (fs.existsSync(docsDirectory)) {
  collectMarkdown(docsDirectory);
}

const skillDirectory = path.join(root, 'skills');
if (fs.existsSync(skillDirectory)) {
  collectMarkdown(skillDirectory);
}

const failures = [];
const markdownLink = /\[[^\]]*\]\(([^)]+)\)/g;

for (const relativeFile of markdownFiles) {
  const sourcePath = path.join(root, relativeFile);
  const source = fs.readFileSync(sourcePath, 'utf8');

  for (const match of source.matchAll(markdownLink)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, '');
    if (!rawTarget || rawTarget.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(rawTarget)) {
      continue;
    }

    const target = decodeURIComponent(rawTarget.split('#')[0]);
    const resolved = path.resolve(path.dirname(sourcePath), target);
    if (!fs.existsSync(resolved)) {
      failures.push(`${relativeFile} -> ${rawTarget}`);
    }
  }
}

if (failures.length > 0) {
  console.error('FAIL: broken local documentation links found:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`PASS: local links resolve across ${markdownFiles.length} Markdown files.`);
