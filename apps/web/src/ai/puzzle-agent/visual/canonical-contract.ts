import { z } from "zod";
export const CANONICAL_MAX_BYTES = 1_048_576;
export const CanonicalBoardSchema = z
  .object({
    version: z.literal(1),
    pngDataUrl: z
      .string()
      .max(22 + 4 * Math.ceil(CANONICAL_MAX_BYTES / 3))
      .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    width: z.number().int().min(1).max(2048),
    height: z.number().int().min(1).max(2048),
    sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type CanonicalBoard = z.infer<typeof CanonicalBoardSchema>;
/** Browser-safe bounded integrity check before any pixels are displayed. */
export async function validateCanonicalBoard(value: unknown): Promise<Uint8Array<ArrayBuffer>> {
  const board = CanonicalBoardSchema.parse(value);
  const encoded = board.pngDataUrl.slice(22);
  const decoded = atob(encoded);
  if (decoded.length > CANONICAL_MAX_BYTES || decoded.length < 33 || btoa(decoded) !== encoded)
    throw new Error("Invalid canonical PNG encoding");
  const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
  if ([137, 80, 78, 71, 13, 10, 26, 10].some((n, i) => bytes[i] !== n))
    throw new Error("Invalid canonical PNG");
  const view = new DataView(bytes.buffer);
  if (
    view.getUint32(8) !== 13 ||
    view.getUint32(12) !== 0x49484452 ||
    view.getUint32(16) !== board.width ||
    view.getUint32(20) !== board.height
  )
    throw new Error("Canonical PNG dimensions mismatch");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, "0")).join("");
  if (hash !== board.sha256) throw new Error("Canonical PNG integrity mismatch");
  return bytes;
}
