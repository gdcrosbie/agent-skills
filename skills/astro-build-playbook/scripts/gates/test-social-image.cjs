const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'dist/index.html');
assert.ok(fs.existsSync(indexPath), 'dist/index.html is missing; run the production build first.');

const document = new JSDOM(fs.readFileSync(indexPath, 'utf8')).window.document;
const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
assert.ok(imageUrl, 'The built home page is missing og:image metadata.');

const imagePath = path.join(root, 'dist', new URL(imageUrl).pathname);
assert.ok(fs.existsSync(imagePath), `The social image does not exist in the build: ${imageUrl}`);

const image = fs.readFileSync(imagePath);
assert.equal(image.readUInt16BE(0), 0xffd8, 'The default social image is not a JPEG.');

let offset = 2;
let dimensions;
const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

while (offset < image.length) {
  if (image[offset] !== 0xff) {
    offset += 1;
    continue;
  }

  const marker = image[offset + 1];
  offset += 2;
  if (marker === 0xd8 || marker === 0xd9) continue;

  const segmentLength = image.readUInt16BE(offset);
  if (startOfFrameMarkers.has(marker)) {
    dimensions = {
      height: image.readUInt16BE(offset + 3),
      width: image.readUInt16BE(offset + 5),
    };
    break;
  }
  offset += segmentLength;
}

assert.deepEqual(dimensions, { width: 1200, height: 630 });
assert.equal(document.querySelector('meta[property="og:image:width"]')?.getAttribute('content'), '1200');
assert.equal(document.querySelector('meta[property="og:image:height"]')?.getAttribute('content'), '630');

console.log('PASS: the built site exposes a valid 1200×630 default social image.');
