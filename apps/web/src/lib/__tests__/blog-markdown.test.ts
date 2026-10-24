import { describe, expect, it } from "@jest/globals";
import { separateInlineSteps } from "../blog-markdown";

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
