import { sanitizeEveNudgeReply } from "../eve-nudge-reply";

const fallback = "Take another look at the nudge and notice which detail it points you toward.";

it("keeps only the first sentence of a concise Eve reply", () => {
  expect(
    sanitizeEveNudgeReply(
      "Notice the order of the pieces. Read the final answer aloud.",
      "lighthouse"
    )
  ).toBe("Notice the order of the pieces.");
});

it("replaces a reply that spells the answer as separate words", () => {
  expect(sanitizeEveNudgeReply("The light house is nearby.", "lighthouse")).toBe(fallback);
});

it("does not reject a longer word that only partially contains the answer", () => {
  expect(sanitizeEveNudgeReply("The sunset glows above the horizon.", "sun")).toBe(
    "The sunset glows above the horizon."
  );
});

it("replaces replies longer than 24 words", () => {
  expect(
    sanitizeEveNudgeReply(
      "Take another look at the arrangement and notice how every piece contributes to the full idea in a familiar phrase that feels complete when spoken aloud.",
      "lighthouse"
    )
  ).toBe(fallback);
});

it("replaces a blank model reply with the fixed answer-blind fallback", () => {
  expect(sanitizeEveNudgeReply(" \n ", "lighthouse")).toBe(fallback);
});
