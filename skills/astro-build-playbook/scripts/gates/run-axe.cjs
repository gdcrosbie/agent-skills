const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const axe = require('axe-core');

const distPath = path.resolve(__dirname, '../dist');
if (!fs.existsSync(distPath)) {
  console.error('FAIL: dist not found. Run "npm run build" first.');
  process.exit(1);
}

function findHtmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? findHtmlFiles(target) : entry.name.endsWith('.html') ? [target] : [];
  });
}

async function audit() {
  const htmlFiles = findHtmlFiles(distPath).sort();
  let violationCount = 0;

  for (const file of htmlFiles) {
    const relativePath = path.relative(distPath, file);
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => {
      if (!error.message.includes("HTMLCanvasElement's getContext()")) {
        console.error(error);
      }
    });

    const dom = new JSDOM(fs.readFileSync(file, 'utf-8'), {
      runScripts: 'outside-only',
      url: `http://localhost/${relativePath}`,
      virtualConsole,
    });

    const results = await axe.run(dom.window.document.documentElement, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });

    console.log(`=== AXE AUDIT: ${relativePath} ===`);
    console.log('Violations:', results.violations.length);
    console.log('Passes:', results.passes.length);

    results.violations.forEach((violation, index) => {
      console.error(`[${index + 1}] ${violation.id} (${violation.impact}) - ${violation.description}`);
      violation.nodes.forEach((node) => {
        console.error('    Target:', node.target.join(', '));
        console.error('    HTML:', node.html);
      });
    });

    violationCount += results.violations.length;
    dom.window.close();
  }

  if (violationCount > 0) {
    console.error(`\nFAIL: ${violationCount} accessibility violation(s) found across ${htmlFiles.length} built pages.`);
    process.exit(1);
  }

  console.log(`\nPASS: 0 accessibility violations found across ${htmlFiles.length} built pages.`);
}

audit().catch((err) => {
  console.error('Axe error:', err);
  process.exit(1);
});
