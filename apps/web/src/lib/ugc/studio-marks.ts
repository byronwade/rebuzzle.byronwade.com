/**
 * Quick-add rebus marks / stickers for Studio free placement.
 * Lines above letters, arrows, and operators that spatial puzzles need.
 */

export type StudioMark = {
  id: string;
  label: string;
  /** Operator symbol or short text glyph */
  kind: "operator" | "text";
  value: string;
  emphasis?: "normal" | "large" | "small" | "strike" | "tiny";
};

export const STUDIO_MARKS: StudioMark[] = [
  { id: "plus", label: "Plus", kind: "operator", value: "+" },
  { id: "minus", label: "Minus", kind: "operator", value: "−" },
  { id: "times", label: "Times", kind: "operator", value: "×" },
  { id: "equals", label: "Equals", kind: "operator", value: "=" },
  { id: "slash", label: "Slash", kind: "operator", value: "/" },
  { id: "line", label: "Line", kind: "text", value: "─", emphasis: "large" },
  { id: "overline", label: "Bar", kind: "text", value: "‾", emphasis: "large" },
  { id: "underscore", label: "Under", kind: "text", value: "_", emphasis: "large" },
  { id: "arrow-up", label: "Up", kind: "operator", value: "↑" },
  { id: "arrow-down", label: "Down", kind: "operator", value: "↓" },
  { id: "arrow-left", label: "Left", kind: "operator", value: "←" },
  { id: "arrow-right", label: "Right", kind: "operator", value: "→" },
  { id: "dot", label: "Dot", kind: "operator", value: "·" },
  { id: "circle", label: "Circle", kind: "text", value: "○", emphasis: "large" },
  { id: "square", label: "Square", kind: "text", value: "□", emphasis: "large" },
  { id: "triangle", label: "Tri", kind: "text", value: "△", emphasis: "large" },
  { id: "question", label: "?", kind: "text", value: "?", emphasis: "large" },
  { id: "amp", label: "&", kind: "text", value: "&", emphasis: "large" },
  { id: "hash", label: "#", kind: "text", value: "#", emphasis: "large" },
  { id: "percent", label: "%", kind: "text", value: "%", emphasis: "large" },
  { id: "one", label: "1", kind: "text", value: "1", emphasis: "large" },
  { id: "two", label: "2", kind: "text", value: "2", emphasis: "large" },
  { id: "three", label: "3", kind: "text", value: "3", emphasis: "large" },
  { id: "four", label: "4", kind: "text", value: "4", emphasis: "large" },
  { id: "a", label: "A", kind: "text", value: "A", emphasis: "large" },
  { id: "b", label: "B", kind: "text", value: "B", emphasis: "large" },
  { id: "i", label: "I", kind: "text", value: "I", emphasis: "large" },
  { id: "u", label: "U", kind: "text", value: "U", emphasis: "large" },
  { id: "x", label: "X", kind: "text", value: "X", emphasis: "large" },
  { id: "z", label: "Z", kind: "text", value: "Z", emphasis: "large" },
];

export const STUDIO_AI_GENERATION_LIMIT = 3;
