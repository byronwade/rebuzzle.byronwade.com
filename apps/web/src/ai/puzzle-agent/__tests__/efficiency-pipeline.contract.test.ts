/**
 * Contract tests for the agent-efficiency buildout.
 *
 * These do not call live models. They prove the host surfaces, tool wiring,
 * and fail-closed invariants actually exist and stay consistent — so we cannot
 * claim a capability the runtime never exposes.
 *
 * Note: we assert in-process tool keys via source (not by importing tools.ts)
 * so Jest never loads the AI SDK ESM graph through critique/client.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { digestRejectionTexts } from "../../learning/rejection-digest";
import {
  answerSeedCuePlanIssues,
  missingAnswerSeedCues,
} from "../apex/answer-seed-cues";
import {
  buildCritiqueRepairParams,
  critiqueRepairIssues,
} from "../apex/critique-repair";
import {
  inspectAnswerSeedCuePlan,
  layersFromAnswerSeedCues,
} from "../apex/cue-plan-preflight";
import {
  progressiveHintPublishBlockers,
  shouldRunProgressiveHintVision,
} from "../apex/progressive-hint-vision";
import { biasTechniquesBySolveRates } from "../apex/technique-calibration";
import { EFFICIENCY_AGENT_TOOLS, PUBLICATION_AGENT_TOOLS } from "../publication-tools";
import { resolveCuratedPictogram } from "../visual/curated-pictograms";

const AGENT_TOOLS_DIR = join(process.cwd(), "agent/tools");
const IN_PROCESS_TOOLS_SOURCE = readFileSync(
  join(process.cwd(), "src/ai/puzzle-agent/tools.ts"),
  "utf8"
);
const RUN_GENERATION_SOURCE = readFileSync(
  join(process.cwd(), "src/ai/puzzle-agent/run-generation.ts"),
  "utf8"
);

function toolDefinedInSource(source: string, toolName: string): boolean {
  return new RegExp(`${toolName}\\s*:\\s*tool\\s*\\(`).test(source);
}

describe("efficiency pipeline contracts", () => {
  describe("tool surface parity", () => {
    it("defines every efficiency + publication tool on the in-process ToolLoop surface", () => {
      for (const toolName of EFFICIENCY_AGENT_TOOLS) {
        expect(toolDefinedInSource(IN_PROCESS_TOOLS_SOURCE, toolName)).toBe(true);
      }
      for (const toolName of PUBLICATION_AGENT_TOOLS) {
        expect(toolDefinedInSource(IN_PROCESS_TOOLS_SOURCE, toolName)).toBe(true);
      }
    });

    it("mirrors efficiency tools under agent/tools for Eve", () => {
      expect(existsSync(AGENT_TOOLS_DIR)).toBe(true);
      const eveTools = new Set(
        readdirSync(AGENT_TOOLS_DIR)
          .filter((name) => name.endsWith(".ts"))
          .map((name) => name.replace(/\.ts$/, ""))
      );
      for (const toolName of EFFICIENCY_AGENT_TOOLS) {
        expect(eveTools.has(toolName)).toBe(true);
      }
    });

    it("wires publication activeTools from publication-tools (not a stale inline list)", () => {
      expect(RUN_GENERATION_SOURCE).toMatch(/PUBLICATION_AGENT_TOOLS/);
      expect(RUN_GENERATION_SOURCE).toMatch(/from ["'].*publication-tools["']/);
      const missing = PUBLICATION_AGENT_TOOLS.filter(
        (name) => !toolDefinedInSource(IN_PROCESS_TOOLS_SOURCE, name)
      );
      expect(missing).toEqual([]);
    });
  });

  describe("cue-plan host contracts", () => {
    const validCues = [
      { kind: "catalog" as const, concept: "key", role: "word-part" as const },
      { kind: "text" as const, content: "BOARD", role: "word-part" as const },
    ];

    it("accepts reviewed catalog cues and rejects quarantined ones", () => {
      expect(resolveCuratedPictogram("key")).not.toBeNull();
      expect(answerSeedCuePlanIssues(validCues)).toEqual([]);
      expect(
        answerSeedCuePlanIssues([
          { kind: "catalog", concept: "box", role: "word-part" },
        ])
      ).not.toEqual([]);
    });

    it("builds deterministic layers that still satisfy the cue contract", () => {
      const layers = layersFromAnswerSeedCues(validCues);
      const visual = {
        styleId: "ink-pictogram-v1" as const,
        mode: "composed" as const,
        layout: "row" as const,
        layers,
        unicodeFallback: "key BOARD",
      };
      expect(missingAnswerSeedCues({ visual, cues: validCues })).toEqual([]);
      const inspection = inspectAnswerSeedCuePlan({ cues: validCues, visual });
      expect(inspection.ready).toBe(true);
      expect(inspection.issues).toEqual([]);
      expect(inspection.layerPlan).toHaveLength(2);
    });

    it("marks incomplete boards as not ready", () => {
      const inspection = inspectAnswerSeedCuePlan({
        cues: validCues,
        visual: {
          styleId: "ink-pictogram-v1",
          mode: "composed",
          layout: "row",
          unicodeFallback: "🔑",
          layers: [
            {
              kind: "pictogram",
              concept: "key",
              emojiFallback: "🔑",
            },
          ],
        },
      });
      expect(inspection.ready).toBe(false);
      expect(inspection.missingOnBoard).toContain("Missing text cue BOARD");
    });
  });

  describe("rejection digester taxonomy", () => {
    it("classifies every known failure family into avoid/prefer guidance", () => {
      const samples = [
        "Answer-first visual cue contract failed: Missing catalog cue flower",
        "Invalid answer-seed cue contract: not an approved catalog concept",
        "Semantic alignment failed (token-coverage): missing part",
        "Pictogram lighthouse is pending human approval",
        "Rendered board objects not recognized: door",
        "Blind solve tournament rejected candidate",
        "Critique reject: overused trope",
        "Composition rejected: unknown concept",
        "Answer is not unique / banned answer",
        "Quality below threshold / funScore too low",
        "Apex engine produced no candidates",
        "AI_BUDGET_EXCEEDED rate limit",
      ];
      const digest = digestRejectionTexts(samples, { topN: 8 });
      expect(digest.sampleSize).toBe(samples.length);
      expect(digest.buckets.length).toBeGreaterThanOrEqual(8);
      expect(digest.avoidPatterns.length).toBeGreaterThan(0);
      expect(digest.preferPatterns.length).toBeGreaterThan(0);
      // Unknown noise must not invent fake guidance by itself.
      expect(digestRejectionTexts(["totally novel mystery"]).avoidPatterns).toEqual([]);
    });
  });

  describe("critique-locked repair contracts", () => {
    it("refuses unlocked repairs and builds locked ToolLoop params", () => {
      expect(
        critiqueRepairIssues({
          answer: "keyboard",
          reviseInstructions: ["clearer icon"],
        })
      ).not.toEqual([]);

      const params = buildCritiqueRepairParams({
        answer: "keyboard",
        answerSeedCuePlan: [
          { kind: "catalog", concept: "key", role: "word-part" },
          { kind: "text", content: "BOARD", role: "word-part" },
        ],
        techniqueId: "simple_compound",
        reviseInstructions: ["Use a clearer key silhouette"],
        targetDifficulty: 5,
      });
      expect(params.repairMode).toBe("critique-locked");
      expect(params.answerSeed).toBe("keyboard");
      expect(params.phraseSeeds).toEqual([]);
      expect(params.maxAttempts).toBe(1);
      expect(params.modelChainLimit).toBe(1);
    });
  });

  describe("technique calibration contracts", () => {
    it("reorders techniques under too-easy and too-hard pressure only", () => {
      const preferred = [
        "simple_compound",
        "false_lead_visual",
        "positional_phrase",
      ] as const;
      const rates = [
        { techniqueId: "simple_compound", sampleSize: 10, solveRate: 0.9 },
        { techniqueId: "false_lead_visual", sampleSize: 10, solveRate: 0.3 },
        { techniqueId: "positional_phrase", sampleSize: 10, solveRate: 0.6 },
      ];

      expect(
        biasTechniquesBySolveRates({
          preferredTechniques: [...preferred],
          rates,
          tooEasy: true,
          tooHard: false,
        }).techniques[0]
      ).toBe("false_lead_visual");

      expect(
        biasTechniquesBySolveRates({
          preferredTechniques: [...preferred],
          rates,
          tooEasy: false,
          tooHard: true,
        }).techniques[0]
      ).toBe("simple_compound");

      expect(
        biasTechniquesBySolveRates({
          preferredTechniques: [...preferred],
          rates,
          tooEasy: false,
          tooHard: false,
        }).techniques
      ).toEqual([...preferred]);
    });
  });

  describe("progressive-hint vision contracts", () => {
    it("only spends after blind dominance fails, and blocks unlock failures", () => {
      expect(
        shouldRunProgressiveHintVision({
          profilesWithDominantTarget: 3,
          profileCount: 3,
          topTargetFoundBy: 6,
          requiredVotes: 2,
        })
      ).toBe(false);

      expect(
        shouldRunProgressiveHintVision({
          profilesWithDominantTarget: 0,
          profileCount: 3,
          topTargetFoundBy: 1,
          requiredVotes: 2,
        })
      ).toBe(true);

      expect(
        progressiveHintPublishBlockers({
          hintedAttempted: true,
          hintedUnlocksVisualSolve: false,
        } as never).join(" ")
      ).toMatch(/Progressive-hint vision failed/i);
    });
  });

  describe("host invent fail-closed order", () => {
    it("keeps cue validation → preflight → invent spend in that order", () => {
      // Scope to the generation function body so import lines don't invert order.
      const fnAt = RUN_GENERATION_SOURCE.indexOf("export async function runPuzzleAgentGeneration");
      expect(fnAt).toBeGreaterThan(-1);
      const body = RUN_GENERATION_SOURCE.slice(fnAt);
      const cueValidationAt = body.indexOf("answerSeedCuePlanIssues");
      const preflightAt = body.indexOf("preflightComposeAnswerSeedCuePlan");
      const ensureKeyAt = body.indexOf("ensureGatewayKey()");
      const toolLoopAt = body.indexOf("new ToolLoopAgent");
      expect(cueValidationAt).toBeGreaterThan(-1);
      expect(preflightAt).toBeGreaterThan(cueValidationAt);
      expect(ensureKeyAt).toBeGreaterThan(preflightAt);
      expect(toolLoopAt).toBeGreaterThan(ensureKeyAt);
      expect(body).toMatch(/Cue-plan preflight failed/);
      // Prompt seed lives in the invent-prompt helper above the generation entrypoint.
      expect(RUN_GENERATION_SOURCE).toMatch(/HOST CUE-PLAN PREFLIGHT/);
    });
  });
});
