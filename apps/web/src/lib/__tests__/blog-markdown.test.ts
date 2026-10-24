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

  it("leaves well-formed lists and plain numbers alone", () => {
    const body = "Intro\n\n1. **One**\n2. **Two**\n\nRated 5/10. Plain 3. text";
    expect(separateInlineSteps(body)).toBe(body);
  });
});
