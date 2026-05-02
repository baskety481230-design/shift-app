// Generate PWA icons from an inline SVG using sharp.
// Usage: node scripts/generate-icons.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../public");

// Brand mark — must match the in-app logo (sky → indigo gradient, S monogram)
const SAFE_RATIO = 0.8; // for maskable: keep mark within central 80%

function brandSVG({ size = 512, padding = 0, mark = true } = {}) {
  // padding is the % from each edge (for maskable safe area)
  const inset = Math.round(size * padding);
  const inner = size - inset * 2;
  const r = Math.round(inner * 0.22); // corner radius
  const fontSize = Math.round(inner * 0.56);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0ea5e9"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="${Math.round(inner * 0.01)}"/>
    </filter>
  </defs>
  <rect x="${inset}" y="${inset}" width="${inner}" height="${inner}" rx="${r}" ry="${r}" fill="url(#g)"/>
  ${mark ? `
  <g font-family="Inter, 'Hiragino Sans', system-ui, sans-serif" font-weight="700" fill="#ffffff">
    <text x="${size / 2}" y="${size / 2 + fontSize * 0.36}" font-size="${fontSize}" text-anchor="middle">S</text>
  </g>` : ""}
</svg>`;
}

// Maskable: full-bleed background gradient (no padding) so the system can crop safely.
// We then place the S mark within the inner safe zone.
function maskableSVG({ size = 512 } = {}) {
  const fontSize = Math.round(size * SAFE_RATIO * 0.56);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0ea5e9"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <g font-family="Inter, 'Hiragino Sans', system-ui, sans-serif" font-weight="700" fill="#ffffff">
    <text x="${size / 2}" y="${size / 2 + fontSize * 0.36}" font-size="${fontSize}" text-anchor="middle">S</text>
  </g>
</svg>`;
}

async function renderPng(svg, size, outFile) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(outFile, png);
  console.log(`✓ ${path.relative(process.cwd(), outFile)} (${png.length} bytes)`);
}

async function main() {
  await mkdir(PUBLIC_DIR, { recursive: true });

  // Standard square icons (rounded badge with padding looks good in browser tabs)
  await renderPng(brandSVG({ size: 192, padding: 0 }), 192, path.join(PUBLIC_DIR, "icon-192.png"));
  await renderPng(brandSVG({ size: 512, padding: 0 }), 512, path.join(PUBLIC_DIR, "icon-512.png"));

  // Maskable: full-bleed for OS crop
  await renderPng(maskableSVG({ size: 512 }), 512, path.join(PUBLIC_DIR, "icon-512-maskable.png"));

  // Apple touch icon (iOS will round the corners itself)
  await renderPng(maskableSVG({ size: 180 }), 180, path.join(PUBLIC_DIR, "apple-touch-icon.png"));

  console.log("\nDone. Icons written to public/.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
