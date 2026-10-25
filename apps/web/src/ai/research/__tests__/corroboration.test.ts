import {
  corroborateClaims,
  extractClaimNumbers,
  lexicalOverlap,
  usableClaims,
} from "../corroboration";
import type { ResearchSource } from "../types";

const sources: ResearchSource[] = [
  {
    id: "S1",
    url: "https://www.etymonline.com/word/weather",
    title: "Under the weather — etymology",
    snippet: "Under the weather, meaning ill or indisposed, is recorded from 1827 in nautical use.",
    domain: "etymonline.com",
    tier: "reference",
  },
  {
    id: "S2",
    url: "https://blog.example.net/idioms",
    title: "Weather idioms",
    snippet: "Feeling under the weather means feeling ill; sailors used the phrase.",
    domain: "example.net",
    tier: "general",
  },
  {
    id: "S3",
    url: "https://other.example.org/sailing",
    title: "Sailing words",
    snippet: "Sailors who felt ill went below deck, under the weather side.",
    domain: "example.org",
    tier: "general",
  },
  {
    id: "S4",
    url: "https://reddit.com/r/words",
    title: "Thread",
    snippet: "under the weather is from sailors i think",
    domain: "reddit.com",
    tier: "low",
  },
];

function claim(statement: string, sourceIds: string[], kind = "meaning") {
  return { statement, kind, sourceIds };
}

describe("corroborateClaims", () => {
  it("verifies a claim backed by a reference source", () => {
    const { claims } = corroborateClaims(
      [claim("It means feeling ill or indisposed.", ["S1"])],
      sources
    );
    expect(claims[0]?.support).toBe("verified");
    expect(claims[0]?.confidence).toBeGreaterThan(0.6);
  });

  it("verifies a claim backed by two independent general domains", () => {
    const { claims } = corroborateClaims(
      [claim("Sailors who felt ill used the phrase.", ["S2", "S3"], "origin")],
      sources
    );
    expect(claims[0]?.support).toBe("verified");
  });

  it("marks one general domain as single-source", () => {
    const { claims } = corroborateClaims(
      [claim("Feeling under the weather means ill.", ["S2"])],
      sources
    );
    expect(claims[0]?.support).toBe("single-source");
  });

  it("drops invented citations and counts them", () => {
    const { claims, droppedCitations } = corroborateClaims(
      [claim("It means ill.", ["S9", "s1"])],
      sources
    );
    expect(droppedCitations).toBe(1);
    expect(claims[0]?.sourceIds).toEqual(["S1"]);
    expect(claims[0]?.notes).toContain("cited a source that was never retrieved");
  });

  it("never verifies a claim backed only by low-trust pages", () => {
    const { claims } = corroborateClaims([claim("It is from sailors.", ["S4"], "origin")], sources);
    expect(claims[0]?.support).toBe("unsupported");
  });

  it("rejects a year the cited text does not contain", () => {
    const { claims } = corroborateClaims(
      [claim("The phrase was first recorded in 1795 in nautical use.", ["S1"], "origin")],
      sources
    );
    expect(claims[0]?.support).toBe("unsupported");
    expect(claims[0]?.notes.join(" ")).toContain("1795");
  });

  it("accepts a year the cited text does contain", () => {
    const { claims } = corroborateClaims(
      [claim("Recorded from 1827 in nautical use.", ["S1"], "origin")],
      sources
    );
    expect(claims[0]?.support).toBe("verified");
  });

  it("rejects a claim whose wording is absent from its citation", () => {
    const { claims } = corroborateClaims(
      [claim("Popularized by Shakespeare's comedic plays in London theatres.", ["S1"], "origin")],
      sources
    );
    expect(claims[0]?.support).toBe("unsupported");
  });

  it("does not let an unrelated reference vouch for a low-trust assertion", () => {
    const { claims } = corroborateClaims(
      [claim("Shakespeare popularized under the weather in 1599.", ["S1", "S4"], "origin")],
      [
        { ...sources[0], snippet: "Under the weather: somewhat ill." } as ResearchSource,
        {
          ...sources[3],
          snippet: "shakespeare popularized under the weather in 1599 trust me",
        } as ResearchSource,
      ]
    );
    expect(claims[0]?.support).toBe("unsupported");
    expect(claims[0]?.sourceIds).toEqual(["S4"]);
  });

  it("filters usable claims", () => {
    const { claims } = corroborateClaims(
      [claim("It means ill.", ["S1"]), claim("No citation here.", [])],
      sources
    );
    expect(usableClaims(claims)).toHaveLength(1);
  });
});

describe("helpers", () => {
  it("extracts years, decades, and ordinals", () => {
    expect(extractClaimNumbers("In the 1830s, by 1843, in the 17th century")).toEqual([
      "1830s",
      "1843",
      "17",
    ]);
  });

  it("measures lexical overlap", () => {
    expect(lexicalOverlap("sailors felt ill", "Sailors who felt ill")).toBe(1);
    expect(lexicalOverlap("Shakespeare theatre", "sailors ill")).toBe(0);
  });
});
