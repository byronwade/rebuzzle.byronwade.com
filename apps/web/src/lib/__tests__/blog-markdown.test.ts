import { describe, expect, it } from "@jest/globals";
import { remarkSmartQuotes, separateInlineSteps } from "../blog-markdown";
import { labelFromSlug, smartQuotes } from "../typography";

describe("separateInlineSteps", () => {
  it("breaks bold-led steps run into a paragraph onto list lines", () => {
    expect(separateInlineSteps("approach:1. **Look** at it.2. **Say** it.")).toBe(
      "approach:\n\n1. **Look** at it.\n\n2. **Say** it."
    );
  });

  it("keeps multi-digit step numbers whole", () => {
    expect(separateInlineSteps("done.10. **Last**")).toBe("done.\n\n10. **Last**");
  });

  it("leaves already formatted multi-digit list items alone", () => {
    const body = "Steps\n\n9. **Nine**\n10. **Ten**\n11. **Eleven**";
    expect(separateInlineSteps(body)).toBe(body);
  });

  it("splits steps that follow a space", () => {
    expect(separateInlineSteps("Try this. 1. **Look** first. 2. **Say** it.")).toBe(
      "Try this.\n\n1. **Look** first.\n\n2. **Say** it."
    );
  });

  it("leaves nested and blockquoted lists alone", () => {
    const nested = "1. **Parent**\n   1. **Child**\n   2. **Sibling**";
    expect(separateInlineSteps(nested)).toBe(nested);
    const quoted = "> 1. **Look**\n> 2. **Say**";
    expect(separateInlineSteps(quoted)).toBe(quoted);
  });

  it("leaves well-formed lists and plain numbers alone", () => {
    const body = "Intro\n\n1. **One**\n2. **Two**\n\nRated 5/10. Plain 3. text";
    expect(separateInlineSteps(body)).toBe(body);
  });
});

describe("smartQuotes", () => {
  it("curls apostrophes and single quotes", () => {
    expect(smartQuotes("Today's 'aha!' moment")).toBe("Today’s ‘aha!’ moment");
  });

  it("curls double quotes and keeps leading-position quotes opening", () => {
    expect(smartQuotes('"Bee four" (or "before")')).toBe("“Bee four” (or “before”)");
  });

  it("turns three dots into an ellipsis", () => {
    expect(smartQuotes("Wait...")).toBe("Wait…");
  });
});

describe("remarkSmartQuotes", () => {
  it("rewrites text nodes and leaves inline code alone", () => {
    const tree = {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            { type: "text", value: "it's " },
            { type: "inlineCode", value: "don't" },
          ],
        },
      ],
    };
    remarkSmartQuotes()(tree);
    const [paragraph] = tree.children;
    expect(paragraph.children[0].value).toBe("it’s ");
    expect(paragraph.children[1].value).toBe("don't");
  });
});

describe("remarkSmartQuotes across inline nodes", () => {
  it("closes a quote that follows emphasis", () => {
    const tree = {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            { type: "text", value: 'say "' },
            { type: "emphasis", children: [{ type: "text", value: "bee" }] },
            { type: "text", value: '" out loud' },
          ],
        },
      ],
    };
    remarkSmartQuotes()(tree);
    const [paragraph] = tree.children;
    expect(paragraph.children[0].value).toBe("say \u201c");
    expect(paragraph.children[2].value).toBe("\u201d out loud");
  });
});

describe("labelFromSlug", () => {
  it("turns catalog slugs into sentence-case labels", () => {
    expect(labelFromSlug("alarm-clock")).toBe("Alarm clock");
    expect(labelFromSlug("bed")).toBe("Bed");
  });
});
