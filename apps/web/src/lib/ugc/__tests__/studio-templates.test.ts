import { humanizeGradeIssue, STUDIO_TEMPLATES } from "../studio-templates";

describe("studio templates", () => {
  it("ships starter boards with complete copy", () => {
    expect(STUDIO_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    for (const template of STUDIO_TEMPLATES) {
      expect(template.answer.length).toBeGreaterThan(2);
      expect(template.explanation.length).toBeGreaterThan(24);
      expect(template.hints).toHaveLength(3);
      expect(template.concepts.length + (template.textLayers?.length ?? 0)).toBeGreaterThan(0);
    }
  });

  it("humanizes common grade failures", () => {
    expect(humanizeGradeIssue("That answer is already in the puzzle archive")).toMatch(/fresher/i);
    expect(humanizeGradeIssue("Answer is visible in the board text")).toMatch(/Hide/i);
  });
});
