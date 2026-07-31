/**
 * Avatar Utilities
 *
 * Generate deterministic avatar colors and properties based on username
 */

/**
 * Generate a simple hash from a string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Avatar palette.
 *
 * Every entry is a two-stop gradient drawn from the brand's own develop /
 * preview / ship pairs, plus their cross-pairings and a plain ink fill. No
 * colour here exists outside the design system, so a wall of avatars on the
 * leaderboard still reads as one surface.
 *
 * Order is part of the public contract: `avatarColorIndex` is persisted per
 * user, so append new entries rather than reordering existing ones.
 */
const AVATAR_COLORS = [
  // develop — blue → teal
  { bg: "bg-gradient-to-br from-[#007cf0] to-[#00dfd8]", text: "text-white" },
  // preview — violet → pink
  { bg: "bg-gradient-to-br from-[#7928ca] to-[#ff0080]", text: "text-white" },
  // ship — coral → amber
  { bg: "bg-gradient-to-br from-[#ff4d4d] to-[#f9cb28]", text: "text-white" },
  // cross-pairings, still inside the same six stops
  { bg: "bg-gradient-to-br from-[#00dfd8] to-[#7928ca]", text: "text-white" },
  { bg: "bg-gradient-to-br from-[#ff0080] to-[#ff4d4d]", text: "text-white" },
  { bg: "bg-gradient-to-br from-[#f9cb28] to-[#007cf0]", text: "text-white" },
  { bg: "bg-gradient-to-br from-[#007cf0] to-[#7928ca]", text: "text-white" },
  { bg: "bg-gradient-to-br from-[#00dfd8] to-[#f9cb28]", text: "text-white" },
  { bg: "bg-gradient-to-br from-[#ff0080] to-[#7928ca]", text: "text-white" },
  // ink — the system's own primary
  { bg: "bg-foreground", text: "text-background" },
] as const;

export interface AvatarProps {
  initials: string;
  bgColor: string;
  textColor: string;
  darkBgColor?: string;
  darkTextColor?: string;
}

export interface AvatarPreferences {
  colorIndex?: number;
  customInitials?: string;
}

/**
 * Generate avatar properties from username
 * Returns deterministic colors and initials based on username hash
 * Can be customized with avatar preferences
 */
export function generateAvatarProps(
  username: string,
  preferences?: AvatarPreferences
): AvatarProps {
  if (!username || username.trim().length === 0) {
    username = "User";
  }

  // Get initials - use custom if provided, otherwise from username
  let initials: string;
  if (preferences?.customInitials && preferences.customInitials.trim().length > 0) {
    initials = preferences.customInitials.trim().toUpperCase().substring(0, 2);
  } else {
    const trimmed = username.trim();
    initials =
      trimmed.length >= 2 ? trimmed.substring(0, 2).toUpperCase() : trimmed.charAt(0).toUpperCase();
  }

  // Select color - use preference if provided, otherwise hash-based
  let colorIndex: number;
  if (
    preferences?.colorIndex !== undefined &&
    preferences.colorIndex >= 0 &&
    preferences.colorIndex < AVATAR_COLORS.length
  ) {
    colorIndex = preferences.colorIndex;
  } else {
    // Generate hash and select color
    const hash = hashString(username.toLowerCase());
    colorIndex = hash % AVATAR_COLORS.length;
  }

  const color = AVATAR_COLORS[colorIndex] || AVATAR_COLORS[0];

  return {
    initials,
    bgColor: color.bg,
    textColor: color.text,
    // The gradient fills read the same in both themes, so light and dark share
    // one set of classes. The fields stay for API compatibility.
    darkBgColor: color.bg,
    darkTextColor: color.text,
  };
}

/**
 * Get avatar class names for consistent styling
 */
export function getAvatarClassName(props: AvatarProps, useDark = false): string {
  if (useDark && props.darkBgColor && props.darkTextColor) {
    return `${props.darkBgColor} ${props.darkTextColor} font-medium`;
  }
  return `${props.bgColor} ${props.textColor} font-medium`;
}

/** Number of selectable avatar fills — used by the profile colour picker. */
export const AVATAR_COLOR_COUNT = AVATAR_COLORS.length;

/** Class list for a swatch at index, for rendering the picker. */
export function getAvatarSwatchClassName(index: number): string {
  return (AVATAR_COLORS[index] ?? AVATAR_COLORS[0]).bg;
}
