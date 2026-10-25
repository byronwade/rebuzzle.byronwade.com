import {
  canonicalUrl,
  classifySourceDomain,
  rankResearchSources,
  registrableDomain,
} from "../source-quality";

describe("registrableDomain", () => {
  it("strips www and subdomains", () => {
    expect(registrableDomain("https://www.merriam-webster.com/dictionary/x")).toBe(
      "merriam-webster.com"
    );
    expect(registrableDomain("https://en.wiktionary.org/wiki/x")).toBe("wiktionary.org");
    expect(registrableDomain("https://idioms.thefreedictionary.com/x")).toBe(
      "thefreedictionary.com"
    );
  });

  it("keeps compound public suffixes", () => {
    expect(registrableDomain("https://www.phrases.org.uk/meanings/x.html")).toBe("phrases.org.uk");
    expect(registrableDomain("https://www.bbc.co.uk/news")).toBe("bbc.co.uk");
  });

  it("returns empty for invalid URLs", () => {
    expect(registrableDomain("not a url")).toBe("");
  });
});

describe("classifySourceDomain", () => {
  it("ranks references, publishers, the open web, and user content", () => {
    expect(classifySourceDomain("etymonline.com")).toBe("reference");
    expect(classifySourceDomain("dictionary.cambridge.org")).toBe("reference");
    expect(classifySourceDomain("harvard.edu")).toBe("reference");
    expect(classifySourceDomain("ox.ac.uk")).toBe("reference");
    expect(classifySourceDomain("theguardian.com")).toBe("editorial");
    expect(classifySourceDomain("someblog.net")).toBe("general");
    expect(classifySourceDomain("reddit.com")).toBe("low");
    expect(classifySourceDomain("wordplays.com")).toBe("low");
    expect(classifySourceDomain("")).toBe("low");
  });
});

describe("rankResearchSources", () => {
  it("dedupes tracking variants, keeps the richer snippet, and ranks by tier", () => {
    const sources = rankResearchSources([
      { url: "https://www.reddit.com/r/x", title: "thread", snippet: "someone says" },
      { url: "https://blog.example.net/post?utm_source=a", title: "Blog", snippet: "short" },
      {
        url: "https://blog.example.net/post",
        title: "Blog",
        snippet: "a much longer snippet about the phrase",
      },
      { url: "https://www.etymonline.com/word/x", title: "Etymology", snippet: "from 1830s" },
    ]);

    expect(sources.map((s) => s.domain)).toEqual(["etymonline.com", "example.net", "reddit.com"]);
    expect(sources.map((s) => s.id)).toEqual(["S1", "S2", "S3"]);
    expect(sources[1]?.snippet).toBe("a much longer snippet about the phrase");
  });

  it("caps pages per domain so one site cannot corroborate itself", () => {
    const hits = [1, 2, 3, 4].map((n) => ({
      url: `https://en.wikipedia.org/wiki/Page_${n}`,
      title: `Page ${n}`,
    }));
    expect(rankResearchSources(hits, { perDomain: 2 })).toHaveLength(2);
  });

  it("ignores non-http URLs", () => {
    expect(rankResearchSources([{ url: "javascript:alert(1)" }, { url: "" }])).toEqual([]);
  });

  it("canonicalizes URLs for dedupe", () => {
    expect(canonicalUrl("https://WWW.Example.com/a/?utm_medium=x#frag")).toBe("example.com/a");
  });
});
