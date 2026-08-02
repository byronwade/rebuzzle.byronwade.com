export type PuzzleBoardSize = "small" | "medium" | "large";

export type PuzzleBoardSizeSpec = {
  tile: number;
  fontSize: number;
  gap: number;
};

/** Shared by the React player board and the server-side quality renderer. */
export const PUZZLE_BOARD_SIZE_SPECS: Record<PuzzleBoardSize, PuzzleBoardSizeSpec> = {
  small: { tile: 36, fontSize: 18, gap: 6 },
  medium: { tile: 52, fontSize: 24, gap: 8 },
  large: { tile: 72, fontSize: 44, gap: 12 },
};

export const PUZZLE_BOARD_RECOGNITION_PROFILES = [
  {
    id: "compact-320",
    size: "small",
    viewportWidth: 320,
    padding: 12,
  },
  {
    id: "mobile-375",
    size: "large",
    viewportWidth: 375,
    padding: 16,
  },
  {
    id: "desktop-768",
    size: "large",
    viewportWidth: 768,
    padding: 24,
  },
] as const satisfies ReadonlyArray<{
  id: string;
  size: PuzzleBoardSize;
  viewportWidth: number;
  padding: number;
}>;

export type PuzzleBoardRecognitionProfile = (typeof PUZZLE_BOARD_RECOGNITION_PROFILES)[number];
export type PuzzleBoardRecognitionProfileId = PuzzleBoardRecognitionProfile["id"];

export function getPuzzleBoardRecognitionProfile(
  id: PuzzleBoardRecognitionProfileId
): PuzzleBoardRecognitionProfile {
  return PUZZLE_BOARD_RECOGNITION_PROFILES.find((profile) => profile.id === id)!;
}
