const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function parsePNG(buffer) {
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  let idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.slice(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    }
  }

  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = colorType === 6 ? 4 : (colorType === 2 ? 3 : 1);
  const stride = width * bpp + 1;
  const pixels = Buffer.alloc(width * height * 4);

  let prevScanline = Buffer.alloc(width * bpp);

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[y * stride];
    const scanline = decompressed.slice(y * stride + 1, (y + 1) * stride);
    const reconScanline = Buffer.alloc(width * bpp);

    for (let x = 0; x < width * bpp; x++) {
      const a = x >= bpp ? reconScanline[x - bpp] : 0;
      const b = prevScanline[x];
      const c = x >= bpp ? prevScanline[x - bpp] : 0;
      const val = scanline[x];

      let reconstructed = 0;
      if (filterType === 0) reconstructed = val;
      else if (filterType === 1) reconstructed = (val + a) & 0xff;
      else if (filterType === 2) reconstructed = (val + b) & 0xff;
      else if (filterType === 3) reconstructed = (val + Math.floor((a + b) / 2)) & 0xff;
      else if (filterType === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        let pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
        reconstructed = (val + pr) & 0xff;
      }
      reconScanline[x] = reconstructed;
    }
    prevScanline = reconScanline;

    for (let x = 0; x < width; x++) {
      const pIdx = (y * width + x) * 4;
      if (colorType === 6) {
        pixels[pIdx] = reconScanline[x * 4];
        pixels[pIdx + 1] = reconScanline[x * 4 + 1];
        pixels[pIdx + 2] = reconScanline[x * 4 + 2];
        pixels[pIdx + 3] = reconScanline[x * 4 + 3];
      } else if (colorType === 2) {
        pixels[pIdx] = reconScanline[x * 3];
        pixels[pIdx + 1] = reconScanline[x * 3 + 1];
        pixels[pIdx + 2] = reconScanline[x * 3 + 2];
        pixels[pIdx + 3] = 255;
      }
    }
  }

  return { width, height, pixels };
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);

  const rawScanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    rawScanlines[y * (width * 4 + 1)] = 0;
    rgbaBuffer.copy(
      rawScanlines,
      y * (width * 4 + 1) + 1,
      y * width * 4,
      (y + 1) * width * 4
    );
  }

  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function trimAndClean(srcPath, destPath, removeWhite = true) {
  if (!fs.existsSync(srcPath)) {
    console.log('Source does not exist:', srcPath);
    return;
  }
  const buf = fs.readFileSync(srcPath);
  const { width, height, pixels } = parsePNG(buf);

  if (removeWhite) {
    for (let i = 0; i < width * height; i++) {
      const r = pixels[i * 4];
      const g = pixels[i * 4 + 1];
      const b = pixels[i * 4 + 2];
      const a = pixels[i * 4 + 3];
      if (a > 0 && r > 240 && g > 240 && b > 240) {
        pixels[i * 4 + 3] = 0;
      }
    }
  }

  let minX = width, minY = height, maxX = 0, maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = pixels[idx + 3];
      if (a > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    console.log('No content in', srcPath);
    return;
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const cropped = Buffer.alloc(cropW * cropH * 4);

  for (let y = 0; y < cropH; y++) {
    const srcOffset = ((minY + y) * width + minX) * 4;
    const destOffset = y * cropW * 4;
    pixels.copy(cropped, destOffset, srcOffset, srcOffset + cropW * 4);
  }

  const pngOut = encodePNG(cropW, cropH, cropped);
  fs.writeFileSync(destPath, pngOut);
  console.log(`Saved ${destPath} (${cropW}x${cropH})`);
}

const userDir = 'C:\\Users\\baim\\.gemini\\antigravity-ide\\brain\\942fe27c-8a46-48fe-8677-cd6ae504ca69\\.user_uploaded';
const targetDir = 'c:\\Users\\baim\\DOMINO\\web\\public\\assets\\fivelions';

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Process all user uploaded 5 Lions symbols
trimAndClean(path.join(userDir, 'media_1789094378650.png'), path.join(targetDir, 'sym_frog.png'), true);
trimAndClean(path.join(userDir, 'media_1789094378682.png'), path.join(targetDir, 'sym_phoenix.png'), true);
trimAndClean(path.join(userDir, 'media_1789094378698.png'), path.join(targetDir, 'sym_fish.png'), true);
trimAndClean(path.join(userDir, 'media_1789094378722.png'), path.join(targetDir, 'sym_dragon.png'), true);

trimAndClean(path.join(userDir, 'media_1789094607540.png'), path.join(targetDir, 'sym_k.png'), true);
trimAndClean(path.join(userDir, 'media_1789094607552.png'), path.join(targetDir, 'sym_a.png'), true);
trimAndClean(path.join(userDir, 'media_1789094607566.png'), path.join(targetDir, 'sym_turtle.png'), true);
trimAndClean(path.join(userDir, 'media_1789094607570.png'), path.join(targetDir, 'sym_q.png'), true);
trimAndClean(path.join(userDir, 'media_1789094607589.png'), path.join(targetDir, 'sym_j.png'), true);
trimAndClean(path.join(userDir, 'media_1789094668799.png'), path.join(targetDir, 'sym_10.png'), true);
