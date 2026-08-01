/**
 * Generate a single Ink Pictogram v1 SVG ("our emoji") for a concept.
 * Draws parallel candidates, scores clarity + recognition, keeps the best.
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
  /** Extra retries after the first wave (default 2 → up to 3 waves) */
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

type ScoredAttempt = {
  svg: string;
  clarityScore: number;
  clarityReasons: string[];
  seenAs?: string;
  recognitionConfidence: number;
  recognized: boolean;
  redrawAdvice?: string;
  rank: number;
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
  variantHint?: string;
}): string {
  const featureHints = getIconFeatureHints(input.concept);
  const lines = [
    `Subject to draw: "${input.concept}"`,
    input.role ? `Role in the rebus: ${input.role}` : "",
    buildConcreteDrawingBrief(input.concept),
    featureHints,
    input.variantHint ? `Composition variant: ${input.variantHint}` : "",
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
  variantHint?: string;
  temperature?: number;
}): Promise<{ svg: string | null; rawError?: string }> {
  try {
    const response = await generateAIText({
      modelType: "creative",
      temperature: input.temperature ?? (input.attempt === 0 ? 0.45 : 0.72),
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

function rankAttempt(attempt: Omit<ScoredAttempt, "rank">): number {
  // Prefer recognized icons; then clarity; then recognition confidence
  return (
    (attempt.recognized ? 1000 : 0) +
    attempt.clarityScore * 2 +
    attempt.recognitionConfidence * 40
  );
}

async function scoreDrawnSvg(input: {
  svg: string;
  concept: string;
  skipRecognition?: boolean;
}): Promise<ScoredAttempt | null> {
  const clarity = scorePictogramClarity(input.svg);
  if (!clarity.ok) return null;

  if (input.skipRecognition) {
    const base = {
      svg: input.svg,
      clarityScore: clarity.score,
      clarityReasons: clarity.reasons,
      recognitionConfidence: 0.5,
      recognized: true,
    };
    return { ...base, rank: rankAttempt(base) };
  }

  const recognition = await recognizePictogramIcon({
    svg: input.svg,
    concept: input.concept,
  });

  // Transport skip: accept only strong clarity
  const recognized = recognition.skipped
    ? clarity.score >= 70
    : recognition.ok;

  const base = {
    svg: input.svg,
    clarityScore: clarity.score,
    clarityReasons: [
      ...clarity.reasons,
      ...(recognition.skipped ? ["recognition_skipped"] : []),
      ...(!recognized && !recognition.skipped
        ? [`seen_as:${recognition.seenLabel}`]
        : []),
      ...(!recognized && recognition.redrawAdvice
        ? [`redraw:${recognition.redrawAdvice.slice(0, 80)}`]
        : []),
    ],
    seenAs: recognition.seenLabel,
    recognitionConfidence: recognition.skipped ? 0.5 : recognition.confidence,
    recognized,
    redrawAdvice: recognition.redrawAdvice,
  };
  return { ...base, rank: rankAttempt({ ...base }) };
}

export async function generatePictogram(
  input: GeneratePictogramInput
): Promise<GeneratePictogramResult> {
  const concept = input.concept.trim().slice(0, 48);
  const emojiFallback = input.emojiFallback?.trim() || guessEmojiFallback(concept);
  const maxWaves = Math.max(1, Math.min(4, (input.maxRetries ?? 2) + 1));

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

  let best: ScoredAttempt | null = null;
  let lastReasons: string[] = [];
  let lastError = "invalid_svg";
  let lastSeenAs: string | undefined;
  let lastRedrawAdvice: string | undefined;
  let attempts = 0;

  for (let wave = 0; wave < maxWaves; wave += 1) {
    const variants =
      wave === 0
        ? [
            { hint: "canonical iconic view, chunky silhouette", temperature: 0.4 },
            { hint: "slightly different angle; exaggerate identifying marks", temperature: 0.65 },
          ]
        : [
            {
              hint: "simpler geometry, larger subject, unmistakable features",
              temperature: 0.72,
            },
          ];

    const drawn = await Promise.all(
      variants.map((variant) =>
        drawOnce({
          concept,
          role: input.role,
          attempt: wave,
          previousReasons: lastReasons,
          seenAs: lastSeenAs,
          redrawAdvice: lastRedrawAdvice,
          variantHint: variant.hint,
          temperature: variant.temperature,
        })
      )
    );
    attempts += drawn.length;

    for (const item of drawn) {
      if (!item.svg) {
        lastError = item.rawError || "invalid_svg";
        lastReasons = [lastError];
        continue;
      }

      const scored = await scoreDrawnSvg({
        svg: item.svg,
        concept,
        skipRecognition: input.skipRecognition,
      });

      if (!scored) {
        const clarity = scorePictogramClarity(item.svg);
        lastError = `low_clarity:${clarity.score}`;
        lastReasons = clarity.reasons;
        continue;
      }

      lastSeenAs = scored.seenAs;
      lastReasons = scored.clarityReasons;
      if (!scored.recognized) {
        lastError = `recognition_mismatch:seen=${scored.seenAs ?? "unclear"}`;
        lastRedrawAdvice =
          scored.redrawAdvice ||
          `Redraw so a stranger names "${concept}", not "${scored.seenAs ?? "unclear"}".`;
      }

      if (!best || scored.rank > best.rank) best = scored;

      if (scored.recognized && scored.clarityScore >= 58) {
        return {
          styleId: INK_PICTOGRAM_STYLE_ID,
          concept,
          role: input.role,
          svg: scored.svg,
          emojiFallback,
          ok: true,
          clarityScore: scored.clarityScore,
          clarityReasons: scored.clarityReasons,
          seenAs: scored.seenAs,
          recognitionConfidence: scored.recognitionConfidence,
          attempts,
        };
      }
    }
  }

  // Keep the best clear SVG even if recognition never matched — better than emoji blob
  if (best && best.clarityScore >= 62) {
    return {
      styleId: INK_PICTOGRAM_STYLE_ID,
      concept,
      role: input.role,
      svg: best.svg,
      emojiFallback,
      ok: best.recognized,
      clarityScore: best.clarityScore,
      clarityReasons: best.clarityReasons,
      seenAs: best.seenAs,
      recognitionConfidence: best.recognitionConfidence,
      attempts,
      error: best.recognized ? undefined : lastError,
    };
  }

  return {
    styleId: INK_PICTOGRAM_STYLE_ID,
    concept,
    role: input.role,
    svg: null,
    emojiFallback,
    ok: false,
    clarityScore: best?.clarityScore,
    clarityReasons: lastReasons,
    seenAs: lastSeenAs,
    recognitionConfidence: best?.recognitionConfidence,
    attempts,
    error: lastError,
  };
}
