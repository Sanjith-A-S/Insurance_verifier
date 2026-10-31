import { createHash } from 'node:crypto';
import sharp from 'sharp';

export function computeSha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Computes a 64-bit difference hash (dHash) for an image buffer.
 * Resizes to 9x8 grayscale, compares adjacent horizontal pixels.
 */
export async function computeDHash(buffer) {
  try {
    const rawPixels = await sharp(buffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    let binaryString = '';
    // 8 rows of 9 pixels
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const leftPixel = rawPixels[row * 9 + col];
        const rightPixel = rawPixels[row * 9 + col + 1];
        binaryString += leftPixel > rightPixel ? '1' : '0';
      }
    }

    // Convert 64-bit binary to 16-character hex string
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = binaryString.substring(i, i + 4);
      hex += parseInt(nibble, 2).toString(16);
    }
    return hex;
  } catch {
    return null;
  }
}

/**
 * Computes Hamming distance between two hex hashes of equal length.
 */
export function hammingDistance(hex1, hex2) {
  if (!hex1 || !hex2 || hex1.length !== hex2.length) return 64;
  let dist = 0;
  for (let i = 0; i < hex1.length; i++) {
    const n1 = parseInt(hex1[i], 16);
    const n2 = parseInt(hex2[i], 16);
    let xor = n1 ^ n2;
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}
