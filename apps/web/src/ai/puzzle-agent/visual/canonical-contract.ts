import { z } from "zod";
export const CANONICAL_MAX_BYTES = 1_048_576;
export const MAX_CANONICAL_BOARD_HEIGHT = 2_000;
export const CANONICAL_BOARD_HEIGHT_LIMIT_MESSAGE =
  "Review and publishing support boards up to 2,000 pixels tall. Shorten its stacked clues before Eve review, or save it as a draft to keep editing.";
const CanonicalRasterSchema = z
  .object({
    pngDataUrl: z
      .string()
      .max(22 + 4 * Math.ceil(CANONICAL_MAX_BYTES / 3))
      .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    width: z.number().int().min(1).max(2048),
    height: z.number().int().min(1).max(2048),
  })
  .strict();
const CanonicalProfileVariantsSchema = z
  .object({
    "compact-320": CanonicalRasterSchema.optional(),
    "mobile-375": CanonicalRasterSchema.optional(),
    "mobile-375-medium": CanonicalRasterSchema.optional(),
  })
  .strict();
export const CanonicalBoardSchema = CanonicalRasterSchema.extend({
  version: z.literal(1),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  /** Optional responsive rasters; absent on legacy canonical boards. */
  profileVariants: CanonicalProfileVariantsSchema.optional(),
}).strict();
export type CanonicalBoard = z.infer<typeof CanonicalBoardSchema>;

export type CanonicalBoardProfileId =
  | "compact-320"
  | "mobile-375"
  | "mobile-375-medium"
  | "desktop-768";

/** Select an exact-size raster when available, preserving legacy fallback. */
export function canonicalBoardForProfile(
  board: CanonicalBoard,
  profileId: CanonicalBoardProfileId
): CanonicalBoard {
  if (profileId === "desktop-768") return board;
  const variant = board.profileVariants?.[profileId];
  return variant ? { ...board, ...variant } : board;
}
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
