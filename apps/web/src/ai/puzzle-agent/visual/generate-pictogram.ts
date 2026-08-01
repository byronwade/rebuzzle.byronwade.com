/**
 * Generate a single Ink Pictogram v1 SVG ("our emoji") for a concept.
 * Retries when SVG fails clarity gate or blind recognition mismatch.
 */

import { generateAIText } from "@/ai/client";
import { recognizePictogramIcon } from "./critique-pictogram";
import { getIconFeatureHints } from "./icon-features";
import {
  buildConcreteDrawingBrief,
  scorePictogramClarity,
} from "./pictogram-clarity";
import { sanitizePictogramSvg } from "./sanitize-svg";
import {
  INK_PICTOGRAM_PALETTE,
  INK_PICTOGRAM_STYLE_GUIDE,
  INK_PICTOGRAM_STYLE_ID,
} from "./style";

export type GeneratePictogramInput = {
  concept: string;
  role?: string;
  emojiFallback?: string;
  /** Extra retries after the first attempt (default 2 → up to 3 draws) */
  maxRetries?: number;
  /** Skip blind recognition (tests / offline) */
  skipRecognition?: boolean;
};

export type GeneratePictogramResult = {
  styleId: typeof INK_PICTOGRAM_STYLE_ID;
  concept: string;
  role?: string;
  svg: string | null;
  emojiFallback: string;
  ok: boolean;
  clarityScore?: number;
  clarityReasons?: string[];
  seenAs?: string;
  recognitionConfidence?: number;
  attempts?: number;
  error?: string;
};

function guessEmojiFallback(concept: string): string {
  const c = concept.toLowerCase();
  const map: Record<string, string> = {
    bee: "🐝",
    eye: "👁️",
    clock: "🕐",
    hourglass: "⌛",
    sun: "☀️",
    moon: "🌙",
    star: "⭐",
    heart: "❤️",
    fire: "🔥",
    water: "💧",
    rain: "🌧️",
    tree: "🌳",
    leaf: "🍃",
    flower: "🌸",
    fish: "🐟",
    bird: "🐦",
    dog: "🐕",
    cat: "🐱",
    horse: "🐴",
    book: "📖",
    key: "🔑",
    lock: "🔒",
    house: "🏠",
    car: "🚗",
    boat: "⛵",
    train: "🚂",
    plane: "✈️",
    apple: "🍎",
    cake: "🎂",
    bread: "🍞",
    music: "🎵",
    phone: "📱",
    brain: "🧠",
    skull: "💀",
    ghost: "👻",
    rocket: "🚀",
    crown: "👑",
    money: "💰",
    light: "💡",
    bulb: "💡",
    puzzle: "🧩",
    hat: "🎩",
    shoe: "👟",
    hand: "✋",
    foot: "🦶",
    ear: "👂",
    nose: "👃",
    mouth: "👄",
    egg: "🥚",
    bell: "🔔",
    bridge: "🌉",
    mountain: "⛰️",
    cloud: "☁️",
    umbrella: "☂️",
    sword: "⚔️",
    shield: "🛡️",
    trophy: "🏆",
    gift: "🎁",
    ring: "💍",
    candle: "🕯️",
    camera: "📷",
    map: "🗺️",
    compass: "🧭",
    anchor: "⚓",
    wheel: "⚙️",
  };
  for (const [k, v] of Object.entries(map)) {
    if (c.includes(k)) return v;
  }
  return "◆";
}

function buildPrompt(input: {
  concept: string;
  role?: string;
  attempt: number;
  previousReasons?: string[];
  seenAs?: string;
  redrawAdvice?: string;
}): string {
  const featureHints = getIconFeatureHints(input.concept);
  const lines = [
    `Subject to draw: "${input.concept}"`,
    input.role ? `Role in the rebus: ${input.role}` : "",
    buildConcreteDrawingBrief(input.concept),
    featureHints,
    "",
    "REQUIREMENTS:",
    "- Exactly one recognizable object (or classic symbol)",
    "- 3–12 simple shapes/paths with a bold human-sketch silhouette",
    "- Distinctive identifying features (not a vague oval)",
    "- Centered in 64×64 with ~6–8px padding",
    `- Stroke ${INK_PICTOGRAM_PALETTE.ink} width 2.25; optional fill ${INK_PICTOGRAM_PALETTE.canvas}`,
    "- Return ONLY a single <svg>...</svg> — no markdown, no commentary",
    "",
    "FORBIDDEN: abstract blobs, random squiggles, decorative swirls, unreadable geometry,",
    "multiple scenes, tiny hairline details, gradients, filters, purple, text labels",
  ];

  if (input.attempt > 0) {
    lines.push(
      "",
      "PREVIOUS ATTEMPT FAILED — redraw clearer and more iconic.",
      input.previousReasons?.length
        ? `Failure reasons: ${input.previousReasons.join(", ")}`
        : "Make the silhouette unmistakable.",
      input.seenAs
        ? `A player named it "${input.seenAs}" — it MUST read as "${input.concept}".`
        : "",
      input.redrawAdvice ? `Redraw advice: ${input.redrawAdvice}` : "",
      `Emphasize these features: ${featureHints}`,
      "Larger silhouette, fewer flourishes, chunkier strokes."
    );
  }

  return lines.filter(Boolean).join("\n");
}

async function drawOnce(input: {
  concept: string;
  role?: string;
  attempt: number;
  previousReasons?: string[];
  seenAs?: string;
  redrawAdvice?: string;
}): Promise<{ svg: string | null; rawError?: string }> {
  try {
    const response = await generateAIText({
      modelType: "creative",
      temperature: input.attempt === 0 ? 0.45 : 0.7,
      system: [
        INK_PICTOGRAM_STYLE_GUIDE,
        "",
        "Return ONLY a single <svg>...</svg> element. No markdown fences, no commentary.",
        `Palette: ink=${INK_PICTOGRAM_PALETTE.ink}, canvas=${INK_PICTOGRAM_PALETTE.canvas}, accent=${INK_PICTOGRAM_PALETTE.accent}, mist=${INK_PICTOGRAM_PALETTE.mist}.`,
      ].join("\n"),
      prompt: buildPrompt(input),
    });

    return { svg: sanitizePictogramSvg(response.text) };
  } catch (error) {
    return {
      svg: null,
      rawError: error instanceof Error ? error.message : "generate_failed",
    };
  }
}

export async function generatePictogram(
  input: GeneratePictogramInput
): Promise<GeneratePictogramResult> {
  const concept = input.concept.trim().slice(0, 48);
  const emojiFallback = input.emojiFallback?.trim() || guessEmojiFallback(concept);
  const maxAttempts = Math.max(1, Math.min(4, (input.maxRetries ?? 2) + 1));

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

  let lastReasons: string[] = [];
  let lastScore = 0;
  let lastError = "invalid_svg";
  let lastSeenAs: string | undefined;
  let lastRedrawAdvice: string | undefined;
  let lastRecognitionConfidence: number | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const drawn = await drawOnce({
      concept,
      role: input.role,
      attempt,
      previousReasons: lastReasons,
      seenAs: lastSeenAs,
      redrawAdvice: lastRedrawAdvice,
    });

    if (!drawn.svg) {
      lastError = drawn.rawError || "invalid_svg";
      lastReasons = [lastError];
      continue;
    }

    const clarity = scorePictogramClarity(drawn.svg);
    lastScore = clarity.score;
    lastReasons = clarity.reasons;

    if (!clarity.ok) {
      lastError = `low_clarity:${clarity.score}:${clarity.reasons.join(",") || "unreadable"}`;
      continue;
    }

    if (!input.skipRecognition) {
      const recognition = await recognizePictogramIcon({
        svg: drawn.svg,
        concept,
      });
      lastSeenAs = recognition.seenLabel;
      lastRecognitionConfidence = recognition.confidence;
      lastRedrawAdvice = recognition.redrawAdvice;

      if (!recognition.ok) {
        lastReasons = [
          ...clarity.reasons,
          `seen_as:${recognition.seenLabel}`,
          recognition.isAmbiguous ? "ambiguous_icon" : "wrong_object",
        ];
        lastError = `recognition_mismatch:seen=${recognition.seenLabel}`;
        continue;
      }

      return {
        styleId: INK_PICTOGRAM_STYLE_ID,
        concept,
        role: input.role,
        svg: drawn.svg,
        emojiFallback,
        ok: true,
        clarityScore: clarity.score,
        clarityReasons: clarity.reasons,
        seenAs: recognition.seenLabel,
        recognitionConfidence: recognition.confidence,
        attempts: attempt + 1,
      };
    }

    return {
      styleId: INK_PICTOGRAM_STYLE_ID,
      concept,
      role: input.role,
      svg: drawn.svg,
      emojiFallback,
      ok: true,
      clarityScore: clarity.score,
      clarityReasons: clarity.reasons,
      attempts: attempt + 1,
    };
  }

  return {
    styleId: INK_PICTOGRAM_STYLE_ID,
    concept,
    role: input.role,
    svg: null,
    emojiFallback,
    ok: false,
    clarityScore: lastScore,
    clarityReasons: lastReasons,
    seenAs: lastSeenAs,
    recognitionConfidence: lastRecognitionConfidence,
    attempts: maxAttempts,
    error: lastError,
  };
}
