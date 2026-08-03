/**
 * Generate a single Ink Pictogram v1 SVG ("our emoji") for a concept.
 * Retries when SVG fails clarity gate or blind recognition mismatch.
 */

import { generateAIText } from "@/ai/client";
import { logger } from "@/lib/logger";
import { recognizePictogramIcon } from "./critique-pictogram";
import { resolveCuratedPictogram } from "./curated-pictograms";
import { getIconFeatureHints } from "./icon-features";
import { buildConcreteDrawingBrief, scorePictogramClarity } from "./pictogram-clarity";
import {
  evaluatePictogramPixelIntegrity,
  type PictogramPixelIntegrityResult,
} from "./pictogram-pixel-integrity";
import { sanitizePictogramSvg } from "./sanitize-svg";
import { INK_PICTOGRAM_PALETTE, INK_PICTOGRAM_STYLE_GUIDE, INK_PICTOGRAM_STYLE_ID } from "./style";

export type GeneratePictogramInput = {
  concept: string;
  role?: string;
  emojiFallback?: string;
  /** Extra retries after the first attempt (default 2 → up to 3 draws) */
  maxRetries?: number;
  /** Skip blind recognition (tests / offline) */
  skipRecognition?: boolean;
  /**
   * Publication is fail-closed: fresh generated assets are queued for blind
   * human review but cannot be returned to a player-facing composition.
   * Review mode is reserved for the Visual Lab and review tooling.
   */
  usage?: "publication" | "review";
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
  pixelIntegrity?: PictogramPixelIntegrityResult;
  seenAs?: string;
  recognitionConfidence?: number;
  recognitionProfiles?: Array<{ tileSize: number; seenAs: string; confidence: number }>;
  attempts?: number;
  source?: "catalog" | "generated" | "approved-cache";
  assetId?: string;
  error?: string;
};

async function loadGeneratedPictogramRegistry() {
  const module = await import("../review/generated-pictogram-registry-server");
  return module.generatedPictogramRegistry;
}

function guessEmojiFallback(concept: string): string {
  const c = concept.toLowerCase();
  const map: Record<string, string> = {
    "computer mouse": "🖱️",
    "graduation cap": "🎓",
    "hard hat": "⛑️",
    headphones: "🎧",
    "ice cream": "🍨",
    "milk carton": "🥛",
    "paint palette": "🎨",
    "paw print": "🐾",
    "piggy bank": "🐷",
    "shopping bag": "🛍️",
    "soft drink": "🥤",
    "traffic cone": "🚧",
    "trash can": "🗑️",
    "wine glass": "🍷",
    footprints: "👣",
    lightning: "⚡",
    wristwatch: "⌚",
    baby: "👶",
    banana: "🍌",
    battery: "🔋",
    bed: "🛏️",
    bicycle: "🚲",
    bike: "🚲",
    bomb: "💣",
    bone: "🦴",
    box: "📦",
    package: "📦",
    briefcase: "💼",
    bug: "🐛",
    insect: "🐛",
    bus: "🚌",
    candy: "🍬",
    castle: "🏰",
    coffee: "☕",
    cookie: "🍪",
    biscuit: "🍪",
    pot: "🍲",
    soda: "🥤",
    diamond: "💎",
    gemstone: "💎",
    door: "🚪",
    drum: "🥁",
    envelope: "✉️",
    mail: "✉️",
    letter: "✉️",
    feather: "🪶",
    gear: "⚙️",
    cog: "⚙️",
    glasses: "👓",
    globe: "🌍",
    world: "🌍",
    earth: "🌍",
    hammer: "🔨",
    lamp: "🪔",
    medal: "🏅",
    megaphone: "📣",
    milk: "🥛",
    newspaper: "📰",
    news: "📰",
    palette: "🎨",
    paw: "🐾",
    pencil: "✏️",
    pizza: "🍕",
    rabbit: "🐇",
    bunny: "🐇",
    radio: "📻",
    rainbow: "🌈",
    rat: "🐀",
    rodent: "🐀",
    ribbon: "🎀",
    scissors: "✂️",
    shell: "🐚",
    seashell: "🐚",
    shirt: "👕",
    skull: "💀",
    snowflake: "❄️",
    sprout: "🌱",
    seedling: "🌱",
    tent: "⛺",
    ticket: "🎟️",
    trash: "🗑️",
    garbage: "🗑️",
    truck: "🚚",
    television: "📺",
    tv: "📺",
    watch: "⌚",
    waves: "🌊",
    ocean: "🌊",
    wheat: "🌾",
    grain: "🌾",
    wine: "🍷",
    wrench: "🔧",
    spanner: "🔧",
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
      operation: "puzzle-pictogram",
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
  const usage = input.usage ?? "publication";

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
  let lastRecognitionProfiles:
    | Array<{ tileSize: number; seenAs: string; confidence: number }>
    | undefined;
  let lastPixelIntegrity: PictogramPixelIntegrityResult | undefined;

  const curated = resolveCuratedPictogram(concept);
  if (curated) {
    const clarity = scorePictogramClarity(curated.svg);
    const pixelIntegrity = await evaluatePictogramPixelIntegrity(curated.svg);
    lastPixelIntegrity = pixelIntegrity;
    // Publication must still prove blind recognition at player sizes.
    // Only explicit skipRecognition (tests / offline tools) bypasses judges.
    if (clarity.ok && pixelIntegrity.ok && input.skipRecognition) {
      return {
        styleId: INK_PICTOGRAM_STYLE_ID,
        concept,
        role: input.role,
        svg: curated.svg,
        emojiFallback,
        ok: true,
        clarityScore: Math.max(90, clarity.score),
        clarityReasons: [],
        pixelIntegrity,
        attempts: 0,
        source: "catalog",
        assetId: curated.assetId,
      };
    }

    if (clarity.ok && pixelIntegrity.ok) {
      const recognition = await recognizePictogramIcon({
        svg: curated.svg,
        concept,
      });
      if (recognition.ok) {
        return {
          styleId: INK_PICTOGRAM_STYLE_ID,
          concept,
          role: input.role,
          svg: curated.svg,
          emojiFallback,
          ok: true,
          clarityScore: Math.max(90, clarity.score),
          clarityReasons: [],
          pixelIntegrity,
          seenAs: recognition.seenLabel,
          recognitionConfidence: recognition.confidence,
          recognitionProfiles: recognition.profileResults?.map((profile) => ({
            tileSize: profile.tileSize,
            seenAs: profile.seenLabel,
            confidence: profile.confidence,
          })),
          attempts: 0,
          source: "catalog",
          assetId: curated.assetId,
        };
      }

      lastSeenAs = recognition.seenLabel;
      lastRecognitionConfidence = recognition.confidence;
      lastRecognitionProfiles = recognition.profileResults?.map((profile) => ({
        tileSize: profile.tileSize,
        seenAs: profile.seenLabel,
        confidence: profile.confidence,
      }));
      lastRedrawAdvice = recognition.redrawAdvice;
      lastReasons = [`catalog_seen_as:${recognition.seenLabel}`, "catalog_recognition_failed"];
    } else {
      lastReasons = [
        ...clarity.reasons,
        ...pixelIntegrity.reasons,
        "catalog_pixel_integrity_failed",
      ];
    }
  }

  if (!input.skipRecognition) {
    try {
      const registry = await loadGeneratedPictogramRegistry();
      const approved = await registry.findApproved(concept);
      if (approved) {
        const clarity = scorePictogramClarity(approved.svg);
        const pixelIntegrity = await evaluatePictogramPixelIntegrity(approved.svg);
        lastPixelIntegrity = pixelIntegrity;
        const recognition =
          clarity.ok && pixelIntegrity.ok
            ? await recognizePictogramIcon({
                svg: approved.svg,
                concept,
              })
            : undefined;
        if (clarity.ok && pixelIntegrity.ok && recognition?.ok) {
          return {
            styleId: INK_PICTOGRAM_STYLE_ID,
            concept,
            role: input.role,
            svg: approved.svg,
            emojiFallback,
            ok: true,
            clarityScore: clarity.score,
            clarityReasons: clarity.reasons,
            pixelIntegrity,
            seenAs: recognition.seenLabel,
            recognitionConfidence: recognition.confidence,
            recognitionProfiles: recognition.profileResults?.map((profile) => ({
              tileSize: profile.tileSize,
              seenAs: profile.seenLabel,
              confidence: profile.confidence,
            })),
            attempts: 0,
            source: "approved-cache",
            assetId: approved.id,
          };
        }
        await registry.quarantine(
          approved.id,
          !clarity.ok
            ? `Runtime structural clarity regression: ${clarity.reasons.join(", ")}`
            : !pixelIntegrity.ok
              ? `Runtime player-pixel regression: ${pixelIntegrity.reasons.join(", ")}`
              : `Runtime recognition regression: seen as ${recognition?.seenLabel ?? "unclear"}`
        );
        lastSeenAs = recognition?.seenLabel;
        lastRecognitionConfidence = recognition?.confidence;
        lastRecognitionProfiles = recognition?.profileResults?.map((profile) => ({
          tileSize: profile.tileSize,
          seenAs: profile.seenLabel,
          confidence: profile.confidence,
        }));
        lastRedrawAdvice = recognition?.redrawAdvice;
        lastReasons = [
          "approved_cache_regression",
          ...clarity.reasons,
          ...pixelIntegrity.reasons,
          ...(recognition ? [`seen_as:${recognition.seenLabel}`] : []),
        ];
      }
    } catch (error) {
      logger.warn("Generated pictogram registry unavailable", {
        concept,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (usage === "publication") {
    return {
      styleId: INK_PICTOGRAM_STYLE_ID,
      concept,
      role: input.role,
      svg: null,
      emojiFallback,
      ok: false,
      clarityScore: lastScore,
      clarityReasons: lastReasons,
      pixelIntegrity: lastPixelIntegrity,
      seenAs: lastSeenAs,
      recognitionConfidence: lastRecognitionConfidence,
      recognitionProfiles: lastRecognitionProfiles,
      attempts: 0,
      error: "approved_asset_required",
    };
  }

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

    const pixelIntegrity = await evaluatePictogramPixelIntegrity(drawn.svg);
    lastPixelIntegrity = pixelIntegrity;
    if (!pixelIntegrity.ok) {
      lastReasons = [...clarity.reasons, ...pixelIntegrity.reasons];
      lastError = `pixel_integrity:${pixelIntegrity.reasons.join(",")}`;
      continue;
    }

    if (!input.skipRecognition) {
      const recognition = await recognizePictogramIcon({
        svg: drawn.svg,
        concept,
      });
      lastSeenAs = recognition.seenLabel;
      lastRecognitionConfidence = recognition.confidence;
      lastRecognitionProfiles = recognition.profileResults?.map((profile) => ({
        tileSize: profile.tileSize,
        seenAs: profile.seenLabel,
        confidence: profile.confidence,
      }));
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

      let candidateAssetId: string | undefined;
      try {
        const registry = await loadGeneratedPictogramRegistry();
        const candidate = await registry.submitCandidate({
          concept,
          svg: drawn.svg,
          clarityScore: clarity.score,
          seenAs: recognition.seenLabel,
          recognitionConfidence: recognition.confidence,
          recognitionProfiles: lastRecognitionProfiles,
        });
        candidateAssetId = candidate?.id;
      } catch (error) {
        logger.warn("Failed to queue generated pictogram for blind human review", {
          concept,
          error: error instanceof Error ? error.message : String(error),
        });
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
        pixelIntegrity,
        seenAs: recognition.seenLabel,
        recognitionConfidence: recognition.confidence,
        recognitionProfiles: lastRecognitionProfiles,
        attempts: attempt + 1,
        source: "generated",
        assetId: candidateAssetId,
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
      pixelIntegrity,
      attempts: attempt + 1,
      source: "generated",
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
    pixelIntegrity: lastPixelIntegrity,
    seenAs: lastSeenAs,
    recognitionConfidence: lastRecognitionConfidence,
    recognitionProfiles: lastRecognitionProfiles,
    attempts: maxAttempts,
    error: lastError,
  };
}
