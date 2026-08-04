import Svg, { Circle, Rect } from "react-native-svg";

type RebuzzleMarkProps = {
  size?: number;
};

/**
 * Blue game-chip mark — matches web/desktop brand.
 */
export function RebuzzleMark({ size = 64 }: RebuzzleMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Rect width="32" height="32" rx="9" fill="#0070F3" />
      <Circle cx="16" cy="16" r="7.5" fill="#FAFAFA" />
      <Circle
        cx="16"
        cy="16"
        r="5.25"
        fill="none"
        stroke="#171717"
        strokeWidth="2.25"
      />
    </Svg>
  );
}
