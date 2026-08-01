import { formatWordplayForPrompt, type WordplayExpansion } from "../datamuse";

describe("Datamuse wordplay formatting", () => {
  it("formats a compact prompt block", () => {
    const expansion: WordplayExpansion = {
      seed: "bee",
      meansLike: ["insect", "honey"],
      soundsLike: ["be", "b"],
      homophones: ["be"],
      rhymes: ["free", "see"],
      triggers: ["hive", "buzz"],
      synonyms: ["drone"],
    };
    const block = formatWordplayForPrompt(expansion);
    expect(block).toContain('Wordplay around "bee"');
    expect(block).toContain("Homophones: be");
    expect(block).toContain("Rhymes: free, see");
    expect(block).toContain("Associations: hive, buzz");
  });

  it("omits empty sections", () => {
    const block = formatWordplayForPrompt({
      seed: "x",
      meansLike: [],
      soundsLike: [],
      homophones: [],
      rhymes: [],
      triggers: [],
      synonyms: [],
    });
    expect(block).toBe('Wordplay around "x":');
  });
});
