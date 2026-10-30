const generateAIObject = jest.fn();
jest.mock("../../../client", () => ({ generateAIObject }));

import { z } from "zod";
import {
  generateMechanismPlan,
  MechanismPlanProviderSchema,
  validateMechanismPlan,
} from "../mechanism-plan";

const context = {
  answer: "key to success",
  targetDifficulty: 7,
  cues: [{ kind: "catalog" as const, concept: "key", role: "word-part" as const }],
};
const plan = () => ({
  answer: context.answer,
  techniqueId: "spatial_preposition_play",
  layout: "stack",
  layers: [
    { kind: "pictogram", concept: "key", emojiFallback: "🔑" },
    { kind: "text", content: "TO", emphasis: "small" },
    { kind: "text", content: "SUC", emphasis: "normal" },
    { kind: "text", content: "CESS", emphasis: "normal" },
  ],
  deductions: [
    {
      layerIndices: [0, 1],
      visibleCue: "The small TO below the key",
      deduction: "Read the relationship as key to",
      dependsOn: [],
    },
    {
      layerIndices: [2, 3],
      visibleCue: "SUC sits above CESS",
      deduction: "Join the two fragments after the first relationship",
      dependsOn: [0],
    },
  ],
  temptingInterpretation: "A literal key label",
  correction: {
    layerIndices: [1],
    visibleCue: "TO is separated and small",
    deduction: "It is a relation, not a label",
  },
  explanation: "The key relates to the joined word fragments through TO.",
  hints: [
    "Notice the smaller word between the objects.",
    "The middle word connects the object to the fragments.",
    "Join the two fragments after reading the first object's name.",
  ],
});

describe("approved mechanism plans", () => {
  it("accepts distinct native arrangements without replacing them with a template", () => {
    const first = validateMechanismPlan(plan(), context);
    const alternative = {
      ...plan(),
      layout: "free",
      layers: plan().layers.map((l, i) => ({ ...l, x: 20 + i * 20, y: 50 })),
    };
    const second = validateMechanismPlan(alternative, context);
    expect(first.layout).toBe("stack");
    expect(second.layout).toBe("free");
    expect(second.layers[2]).toMatchObject({ x: 60, y: 50 });
  });
  it("locks the answer", () => {
    expect(() => validateMechanismPlan({ ...plan(), answer: "keynote" }, context)).toThrow(
      /answer/i
    );
  });
  it.each([
    { kind: "pictogram", concept: "imaginary-gadget", emojiFallback: "◆" },
    { kind: "pictogram", concept: "key", emojiFallback: "🔑", svg: "<svg/>" },
    { kind: "image", src: "https://example.org/image.png" },
    { kind: "text", content: "WORD", rotation: 90 },
    { kind: "text", content: "🦄", emphasis: "normal" },
  ])("rejects unreviewed or unsupported layers before composition: %j", (layer) => {
    expect(() =>
      validateMechanismPlan({ ...plan(), layers: [layer, ...plan().layers.slice(1)] }, context)
    ).toThrow();
  });
  it("requires native coordinates for every free-layout layer", () => {
    expect(() => validateMechanismPlan({ ...plan(), layout: "free" }, context)).toThrow(
      /coordinates/i
    );
  });
  it("rejects ungrounded deductions and unlinked steps", () => {
    const ungrounded = plan();
    ungrounded.deductions[1]!.layerIndices = [9];
    expect(() => validateMechanismPlan(ungrounded, context)).toThrow(/layer/i);
    const unlinked = plan();
    unlinked.deductions[1]!.dependsOn = [];
    expect(() => validateMechanismPlan(unlinked, context)).toThrow(/linked/i);
  });
  it("rejects answer leaks and repeated hints", () => {
    expect(() =>
      validateMechanismPlan({ ...plan(), hints: [context.answer, "Two", "Three"] }, context)
    ).toThrow(/hint/i);
    expect(() =>
      validateMechanismPlan({ ...plan(), hints: ["Same clue", "Same clue!", "Three"] }, context)
    ).toThrow(/hint/i);
  });
});

it("keeps the approved plan separate from later caller mutation", () => {
  const raw = plan();
  const approved = validateMechanismPlan(raw, context);
  raw.layers.reverse();
  raw.hints[0] = "Changed hint";
  expect(approved.layers[0]?.kind).toBe("pictogram");
  expect(approved.hints[0]).toBe("Notice the smaller word between the objects.");
});

it("uses required nullable coordinates for strict provider output", () => {
  const providerPlan = {
    ...plan(),
    layers: plan().layers.map((layer) => ({ ...layer, x: null, y: null })),
  };
  expect(MechanismPlanProviderSchema.safeParse(providerPlan).success).toBe(true);
  const json = z.toJSONSchema(MechanismPlanProviderSchema) as any;
  expect(JSON.stringify(json)).not.toContain('"oneOf"');
  for (const layer of json.properties.layers.items.anyOf) {
    expect(layer.required).toEqual(expect.arrayContaining(["x", "y"]));
  }
});

it("normalizes strict provider coordinates and uses one explicit planning model call", async () => {
  generateAIObject.mockResolvedValueOnce({
    ...plan(),
    layers: plan().layers.map((layer) => ({ ...layer, x: null, y: null })),
  });
  const result = await generateMechanismPlan(context);
  expect(result.layers[0]?.x).toBeUndefined();
  expect(result.layout).toBe("stack");
  expect(generateAIObject).toHaveBeenCalledTimes(1);
  expect(generateAIObject).toHaveBeenCalledWith(
    expect.objectContaining({
      modelId: process.env.REBUZZLE_MECHANISM_MODEL || "openai/gpt-5.4",
      schema: MechanismPlanProviderSchema,
      operation: "mechanism-plan",
    })
  );
});

it("cannot disguise an unreviewed pictogram as a text layer", () => {
  const raw = plan();
  raw.layers[1] = { kind: "text", content: "🦄", emphasis: "normal" };
  expect(() => validateMechanismPlan(raw, context)).toThrow(/text/i);
});

it("rejects coincident free text before paying to compose unreadable overprints", () => {
  const raw = {
    ...plan(),
    answer: "back to square one",
    layout: "free",
    layers: [
      { kind: "text", content: "SQUARE", emphasis: "large", x: 50, y: 48 },
      { kind: "text", content: "ONE", emphasis: "normal", x: 50, y: 48 },
      { kind: "text", content: "BACK", emphasis: "normal", x: 22, y: 48 },
      { kind: "text", content: "TO", emphasis: "small", x: 36, y: 48 },
    ],
  };
  expect(() =>
    validateMechanismPlan(raw, { ...context, answer: "back to square one", cues: [] })
  ).toThrow(/overprint/i);
});

it("lets an approved designer replace literal seed labels with repetition and placement", () => {
  const repetition = {
    ...plan(),
    answer: "history repeats itself",
    layout: "stack",
    layers: Array.from({ length: 4 }, () => ({
      kind: "text",
      content: "HISTORY",
      emphasis: "normal",
    })),
    deductions: [
      {
        layerIndices: [0, 1],
        visibleCue: "HISTORY appears twice",
        deduction: "Read the duplicated word as repetition",
        dependsOn: [],
      },
      {
        layerIndices: [2, 3],
        visibleCue: "The same HISTORY continues in the lower rows",
        deduction: "The repeated subject is history itself",
        dependsOn: [0],
      },
    ],
  };
  const approved = validateMechanismPlan(repetition, {
    ...context,
    answer: repetition.answer,
    cues: [
      { kind: "text", content: "REPEAT", role: "structural-anchor" },
      { kind: "text", content: "OVER", role: "structural-anchor" },
      { kind: "catalog", concept: "book", role: "semantic-anchor" },
    ],
  });
  expect(approved.layers).toEqual(repetition.layers);
  expect(approved.layout).toBe("stack");
});

it("distinguishes interacting deductions from independently decoded label chunks", async () => {
  generateAIObject.mockResolvedValueOnce({
    ...plan(),
    layers: plan().layers.map((layer) => ({ ...layer, x: null, y: null })),
  });
  await generateMechanismPlan(context);
  const instructions = generateAIObject.mock.calls.at(-1)?.[0]?.system as string;
  expect(instructions).toContain("Joining independently decoded chunks");
  expect(instructions).toContain("synonym substitution");
  expect(instructions).toContain("removing either operation must change the answer");
  expect(instructions).toContain("LONG + clock + NO + eye");
  expect(instructions).toContain("HISTORY + REPEAT");
});
