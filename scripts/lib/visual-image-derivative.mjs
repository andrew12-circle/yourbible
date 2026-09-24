import sharp from 'sharp';
/** Keep full composition and the byte ceiling; never enlarge or synthesize details. */
export async function boundedVisualDerivative(bytes, { size, quality }, maxBytes = 4_900_000) {
  if (!Number.isInteger(size) || size < 1 || !Number.isFinite(quality) || quality < 1 || quality > 100 || maxBytes < 1) throw new Error('Invalid derivative limits');
  const sizes = [...new Set([size, Math.floor(size * 0.85), Math.floor(size * 0.7)])].filter(n => n > 0);
  const qualities = [...new Set([quality, Math.min(quality, 84), Math.min(quality, 76)])];
  for (const dimension of sizes) for (const q of qualities) {
    const result = await sharp(bytes, { limitInputPixels: 100_000_000 }).rotate().resize({ width: dimension, height: dimension, fit: 'inside', withoutEnlargement: true }).webp({ quality: q }).toBuffer({ resolveWithObject: true });
    if (result.data.length <= maxBytes) return result;
  }
  throw new Error('Image cannot meet the derivative byte limit without excessive reduction');
}
