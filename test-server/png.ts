// Minimal PNG writer for the WMS emulation (Node has no canvas): RGBA images from a pixel
// function, deflated with node:zlib. Enough for tiles and legend swatches of a few kilobytes.
import { deflateSync } from 'node:zlib';

export type Rgb = readonly [number, number, number];
export type Rgba = readonly [number, number, number, number];

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** An RGBA PNG of `width` × `height` whose pixels come from `pixel(x, y)`. */
export function encodePng(
  width: number,
  height: number,
  pixel: (x: number, y: number) => Rgba,
): Buffer {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixel(x, y);
      const i = y * stride + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A semi-transparent hatched image in `color` with a one-pixel frame: a GetMap stand-in. */
export function hatchTile(width: number, height: number, color: Rgb): Buffer {
  return encodePng(width, height, (x, y) => {
    const frame = x === 0 || y === 0 || x === width - 1 || y === height - 1;
    const hatch = (x + y) % 16 < 3;
    return [...color, frame ? 220 : hatch ? 150 : 40];
  });
}

/** A legend swatch: a filled box in `color` beside its hatch pattern. */
export function legendImage(color: Rgb): Buffer {
  return encodePng(96, 20, (x, y) => {
    if (x < 20) return [...color, 255];
    if (x < 26) return [0, 0, 0, 0];
    const hatch = (x + y) % 16 < 3;
    return [...color, hatch ? 150 : 40];
  });
}
