// ──────────────────────────────────────────────────────────────────────
//  scripts/generate-demo-assets.mjs
//  Utility to generate placeholder SVG/canvas demo assets.
// ──────────────────────────────────────────────────────────────────────
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  console.log('Generating demo assets for ClaimLens AI...');
  const dirs = [
    'apps/claimant/public/demo',
    'apps/verifier/public/demo',
  ];

  for (const d of dirs) {
    await fs.mkdir(d, { recursive: true });
    const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#111118"/>
      <rect x="20" y="20" width="560" height="360" rx="16" fill="#1a1a24" stroke="rgba(255,255,255,0.1)"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#7eb3ff" font-family="sans-serif" font-weight="700" font-size="24">ClaimLens AI Demo Evidence</text>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#8a8a9a" font-family="sans-serif" font-size="14">SYNTHETIC DEMONSTRATION RECORD</text>
    </svg>`;
    await fs.writeFile(path.join(d, 'sample_evidence.svg'), sampleSvg);
  }
  console.log('Demo assets generated successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

