import { collectSearchHits, hitsFromSearchOutput, searchOutputError } from "../search-results";

describe("hitsFromSearchOutput", () => {
  it("reads Perplexity results", () => {
    expect(
      hitsFromSearchOutput({
        id: "x",
        results: [{ title: "T", url: "https://a.com", snippet: "s", date: "2020-01-01" }],
      })
    ).toEqual([{ url: "https://a.com", title: "T", snippet: "s", publishedAt: "2020-01-01" }]);
  });

  it("reads Exa highlights and Parallel excerpts", () => {
    const exa = hitsFromSearchOutput({
      results: [{ url: "https://b.com", title: "B", highlights: ["one", "two"] }],
    });
    const parallel = hitsFromSearchOutput({
      results: [{ url: "https://c.com", title: "C", excerpts: ["three"] }],
    });
    expect(exa[0]?.snippet).toBe("one … two");
    expect(parallel[0]?.snippet).toBe("three");
  });

  it("ignores malformed rows and error outputs", () => {
    expect(hitsFromSearchOutput({ results: [null, { title: "no url" }, 3] })).toEqual([]);
    expect(hitsFromSearchOutput({ error: "rate_limit", message: "slow down" })).toEqual([]);
    expect(searchOutputError({ error: "rate_limit", message: "slow down" })).toBe("slow down");
    expect(searchOutputError({ results: [] })).toBeUndefined();
  });
});

describe("collectSearchHits", () => {
  it("collects hits, queries, and errors from web_search steps only", () => {
    const collected = collectSearchHits([
      {
        toolResults: [
          {
            toolName: "web_search",
            input: { query: ["a meaning", "a origin"] },
            output: { results: [{ url: "https://a.com", title: "A" }] },
          },
          { toolName: "other_tool", input: {}, output: { results: [{ url: "https://x.com" }] } },
        ],
        sources: [{ sourceType: "url", url: "https://d.com", title: "D" }],
      },
      {
        toolResults: [
          { toolName: "web_search", input: { query: "a meaning" }, output: { error: "timeout" } },
        ],
      },
    ]);
    expect(collected.hits.map((h) => h.url)).toEqual(["https://a.com", "https://d.com"]);
    expect(collected.queries).toEqual(["a meaning", "a origin"]);
    expect(collected.errors).toEqual(["timeout"]);
  });
});
