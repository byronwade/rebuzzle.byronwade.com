/** Offline editorial artifact. Does not register or approve artwork. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { listOriginalPictogramCandidates } from "../src/ai/puzzle-agent/visual/original-pictograms";

async function main() {
const destination = resolve(__dirname, "../../../docs/product/artwork");
mkdirSync(destination, { recursive: true });
const assets = listOriginalPictogramCandidates();
const collectionRevision = assets[0].collectionVersion.split("-").at(-1);
const sizes = [44, 48, 72, 96];
const width = 760;
const pages = [{suffix:"", assets}, ...Array.from({length:Math.ceil(assets.length/10)}, (_, index) => ({suffix:`-page-${index+1}`, assets:assets.slice(index*10,index*10+10)}))];
for (const page of pages) {
const assets = page.assets;
const height = 100 + assets.length * 120;
const rows = assets.map((asset, row) => {
  const y = 95 + row * 120;
  const samples = sizes.map((size, column) => {
    const x = 210 + column * 130;
    const nested = asset.svg.replace('width="64" height="64"', `x="${x}" y="${y}" width="${size}" height="${size}"`);
    return nested;
  }).join("");
  return `<text x="24" y="${y + 32}" font-size="16">${asset.concept}</text><text x="24" y="${y + 52}" font-size="11" fill="#6b756f">candidate · ${asset.artworkVersion}</text>${samples}<path d="M24 ${y + 108}H736" stroke="#d8ddd7"/>`;
}).join("");
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f4f6f3"/><g font-family="sans-serif" fill="#1a1f1c"><text x="24" y="32" font-size="22" font-weight="700">Rebuzzle Ink · authored candidates</text><text x="24" y="55" font-size="12">Editorial contact sheet — no recognition or publication approval</text>${sizes.map((s,i)=>`<text x="${210+i*130}" y="79" font-size="12">${s}px</text>`).join("")}${rows}</g></svg>`;
writeFileSync(resolve(destination, `original-candidates-${collectionRevision}${page.suffix}.svg`), sheet);
await sharp(Buffer.from(sheet)).png().toFile(resolve(destination, `original-candidates-${collectionRevision}${page.suffix}.png`));
}
// Unlabeled assets are separate so later recognition work need not use a labeled sheet.
for (const asset of assets) {
  for (const size of sizes) {
    await sharp(Buffer.from(asset.svg)).resize(size,size).png().toFile(resolve(destination, `${asset.concept}-candidate-${asset.artworkVersion}-${size}.png`));
  }
}
console.log(`Rendered ${assets.length} candidates at ${sizes.join("/")}px in ${destination}`);

}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
