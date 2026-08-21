// Icon generator using Node.js standard libraries (zlib, fs)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, drawFn) {
  const rowSize = width * 4 + 1;
  const rawBuffer = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    rawBuffer[y * rowSize] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = y * rowSize + 1 + x * 4;
      rawBuffer[pixelOffset] = r;
      rawBuffer[pixelOffset + 1] = g;
      rawBuffer[pixelOffset + 2] = b;
      rawBuffer[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawBuffer);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 implementation
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xFF];
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function drawAppIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.44;
  const cornerR = w * 0.22;

  // Rounded squircle background
  const dx = Math.max(0, Math.abs(x - cx) - (w * 0.5 - cornerR));
  const dy = Math.max(0, Math.abs(y - cy) - (h * 0.5 - cornerR));
  const distToEdge = Math.sqrt(dx * dx + dy * dy);

  if (distToEdge > cornerR) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Smooth anti-aliased border
  let alpha = 255;
  if (distToEdge > cornerR - 1) {
    alpha = Math.max(0, Math.min(255, Math.round((cornerR - distToEdge) * 255)));
  }

  // Gradient background: Electric Violet to Cyan (#6366F1 -> #06B6D4)
  const gradT = (nx + ny) * 0.5;
  let r = Math.round(99 + (6 - 99) * gradT);
  let g = Math.round(102 + (182 - 102) * gradT);
  let b = Math.round(241 + (212 - 241) * gradT);

  // Draw Share / Node Icon in white
  // Node 1: right-top (0.68, 0.32)
  // Node 2: right-bottom (0.68, 0.68)
  // Node 3: left-center (0.32, 0.50)
  const p1 = { x: w * 0.68, y: h * 0.32 };
  const p2 = { x: w * 0.68, y: h * 0.68 };
  const p3 = { x: w * 0.32, y: h * 0.50 };
  const nodeR = Math.max(2, w * 0.11);
  const lineW = Math.max(1.5, w * 0.07);

  function distToLine(px, py, l1, l2) {
    const ldx = l2.x - l1.x;
    const ldy = l2.y - l1.y;
    const lenSq = ldx * ldx + ldy * ldy;
    const t = Math.max(0, Math.min(1, ((px - l1.x) * ldx + (py - l1.y) * ldy) / lenSq));
    const projX = l1.x + t * ldx;
    const projY = l1.y + t * ldy;
    return Math.hypot(px - projX, py - projY);
  }

  const d1 = Math.hypot(x - p1.x, y - p1.y);
  const d2 = Math.hypot(x - p2.x, y - p2.y);
  const d3 = Math.hypot(x - p3.x, y - p3.y);
  const dl1 = distToLine(x, y, p3, p1);
  const dl2 = distToLine(x, y, p3, p2);

  const isNode = d1 <= nodeR || d2 <= nodeR || d3 <= nodeR;
  const isLine = dl1 <= lineW * 0.5 || dl2 <= lineW * 0.5;

  if (isNode || isLine) {
    return [255, 255, 255, alpha];
  }

  return [r, g, b, alpha];
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach(size => {
  const pngBuf = createPng(size, size, drawAppIcon);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), pngBuf);
  console.log(`Generated icon${size}.png (${size}x${size})`);
});
