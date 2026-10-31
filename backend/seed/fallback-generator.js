import sharp from 'sharp';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { computeSha256 } from '../src/lib/hash.js';

export async function createSyntheticDemoImage(text = 'SYNTHETIC DEMO IMAGE', width = 800, height = 600) {
  const svgOverlay = `
    <svg width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#1e293b"/>
      <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#38bdf8" text-anchor="middle">
        CLAIMLENS AI — SYNTHETIC DEMO
      </text>
      <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="20" fill="#94a3b8" text-anchor="middle">
        ${text}
      </text>
      <text x="50%" y="85%" font-family="Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">
        Non-production test fixture · Synthetic evidence bytes
      </text>
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svgOverlay))
    .png()
    .toBuffer();

  const sha256 = computeSha256(buffer);
  return { buffer, sha256, mimeType: 'image/png', ext: 'png' };
}

export async function createSyntheticDemoPdf(title = 'SYNTHETIC DEMO DOCUMENT', lines = []) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText('CLAIMLENS AI — SYNTHETIC EVIDENCE FIXTURE', {
    x: 50,
    y: 780,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.4),
  });

  page.drawText(title, {
    x: 50,
    y: 750,
    size: 14,
    font: fontBold,
    color: rgb(0.2, 0.3, 0.3),
  });

  let yPos = 700;
  for (const line of lines) {
    page.drawText(line, {
      x: 50,
      y: yPos,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 22;
  }

  page.drawText('This document is a synthetic test fixture for evaluation and demonstration purposes.', {
    x: 50,
    y: 50,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  const buffer = Buffer.from(pdfBytes);
  const sha256 = computeSha256(buffer);

  return { buffer, sha256, mimeType: 'application/pdf', ext: 'pdf' };
}
