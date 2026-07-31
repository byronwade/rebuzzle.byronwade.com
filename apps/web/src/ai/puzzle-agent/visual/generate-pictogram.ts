/**
 * Generate a single Ink Pictogram v1 SVG ("our emoji") for a concept.
 */

import { generateAIText } from "@/ai/client";
import { sanitizePictogramSvg } from "./sanitize-svg";
import { INK_PICTOGRAM_PALETTE, INK_PICTOGRAM_STYLE_GUIDE, INK_PICTOGRAM_STYLE_ID } from "./style";

export type GeneratePictogramInput = {
  concept: string;
  role?: string;
  emojiFallback?: string;
};

export type GeneratePictogramResult = {
  styleId: typeof INK_PICTOGRAM_STYLE_ID;
  concept: string;
  role?: string;
  svg: string | null;
  emojiFallback: string;
  ok: boolean;
  error?: string;
};

function guessEmojiFallback(concept: string): string {
  const c = concept.toLowerCase();
  const map: Record<string, string> = {
    bee: "🐝",
    eye: "👁️",
    clock: "🕐",
    sun: "☀️",
    moon: "🌙",
    star: "⭐",
    heart: "❤️",
    fire: "🔥",
    water: "💧",
    tree: "🌳",
    fish: "🐟",
    bird: "🐦",
    dog: "🐕",
    cat: "🐱",
    book: "📖",
    key: "🔑",
    lock: "🔒",
    house: "🏠",
    car: "🚗",
    boat: "⛵",
    train: "🚂",
    apple: "🍎",
    cake: "🎂",
    music: "🎵",
    phone: "📱",
    brain: "🧠",
    skull: "💀",
    ghost: "👻",
    rocket: "🚀",
    crown: "👑",
    money: "💰",
    light: "💡",
    puzzle: "🧩",
  };
  for (const [k, v] of Object.entries(map)) {
    if (c.includes(k)) return v;
  }
  return "◆";
}

export async function generatePictogram(
  input: GeneratePictogramInput
): Promise<GeneratePictogramResult> {
  const concept = input.concept.trim().slice(0, 48);
  const emojiFallback = input.emojiFallback?.trim() || guessEmojiFallback(concept);

  if (!concept) {
    return {
      styleId: INK_PICTOGRAM_STYLE_ID,
      concept,
      role: input.role,
      svg: null,
      emojiFallback,
      ok: false,
      error: "concept_required",
    };
  }

  try {
    const response = await generateAIText({
      modelType: "creative",
      temperature: 0.4,
      system: [
        INK_PICTOGRAM_STYLE_GUIDE,
        "",
        "Return ONLY a single <svg>...</svg> element. No markdown, no commentary.",
        `Palette: ink=${INK_PICTOGRAM_PALETTE.ink}, canvas=${INK_PICTOGRAM_PALETTE.canvas}, accent=${INK_PICTOGRAM_PALETTE.accent}, mist=${INK_PICTOGRAM_PALETTE.mist}.`,
      ].join("\n"),
      prompt: [
        `Draw an Ink Pictogram for: "${concept}"`,
        input.role ? `Role in rebus: ${input.role}` : "",
        "Keep it iconic and instantly readable.",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    const svg = sanitizePictogramSvg(response.text);
    if (!svg) {
      return {
        styleId: INK_PICTOGRAM_STYLE_ID,
        concept,
        role: input.role,
        svg: null,
        emojiFallback,
        ok: false,
        error: "invalid_svg",
      };
    }

    return {
      styleId: INK_PICTOGRAM_STYLE_ID,
      concept,
      role: input.role,
      svg,
      emojiFallback,
      ok: true,
    };
  } catch (error) {
    return {
      styleId: INK_PICTOGRAM_STYLE_ID,
      concept,
      role: input.role,
      svg: null,
      emojiFallback,
      ok: false,
      error: error instanceof Error ? error.message : "generate_failed",
    };
  }
}
