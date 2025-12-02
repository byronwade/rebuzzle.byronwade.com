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
 * Color palette with good contrast ratios
 * Each color has a light background and dark text variant
 */
const AVATAR_COLORS = [
  {
    bg: "bg-purple-100",
    text: "text-purple-700",
    darkBg: "bg-purple-600",
    darkText: "text-white",
  },
  {
    bg: "bg-blue-100",
    text: "text-blue-700",
    darkBg: "bg-blue-600",
    darkText: "text-white",
  },
  {
    bg: "bg-green-100",
    text: "text-green-700",
    darkBg: "bg-green-600",
    darkText: "text-white",
  },
  {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    darkBg: "bg-yellow-600",
    darkText: "text-white",
  },
  {
    bg: "bg-pink-100",
    text: "text-pink-700",
    darkBg: "bg-pink-600",
    darkText: "text-white",
  },
  {
    bg: "bg-indigo-100",
    text: "text-indigo-700",
    darkBg: "bg-indigo-600",
    darkText: "text-white",
  },
  {
    bg: "bg-red-100",
    text: "text-red-700",
    darkBg: "bg-red-600",
    darkText: "text-white",
  },
  {
    bg: "bg-teal-100",
    text: "text-teal-700",
    darkBg: "bg-teal-600",
    darkText: "text-white",
  },
  {
    bg: "bg-orange-100",
    text: "text-orange-700",
    darkBg: "bg-orange-600",
    darkText: "text-white",
  },
  {
    bg: "bg-cyan-100",
    text: "text-cyan-700",
    darkBg: "bg-cyan-600",
    darkText: "text-white",
  },
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
    darkBgColor: color.darkBg,
    darkTextColor: color.darkText,
  };
}

/**
 * Get avatar class names for consistent styling
 */
export function getAvatarClassName(props: AvatarProps, useDark = false): string {
  if (useDark && props.darkBgColor && props.darkTextColor) {
    return `${props.darkBgColor} ${props.darkTextColor} font-semibold`;
  }
  return `${props.bgColor} ${props.textColor} font-semibold`;
}
