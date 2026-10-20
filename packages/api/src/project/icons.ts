export const PROJECT_EMOJI_ALLOWLIST = [
  "📁",
  "💼",
  "🏠",
  "📚",
  "✈️",
  "🧠",
  "💡",
  "🔬",
  "🎯",
  "🛠️",
  "📝",
  "🎨",
  "💻",
  "📊",
  "🌱",
  "🔥",
  "❤️",
  "☕",
  "🎮",
  "🐱",
  "🐶",
  "🚗",
  "🏖️",
  "📧",
] as const;

export const PROJECT_LUCIDE_ALLOWLIST = [
  "folder",
  "circle-dollar-sign",
  "lightbulb",
  "image",
  "play",
  "music",
  "sparkles",
  "pencil",
  "briefcase",
  "globe",
  "graduation-cap",
  "wallet",
  "heart",
  "circle",
  "utensils",
  "coffee",
  "code-xml",
  "leaf",
  "cat",
  "dog",
  "car",
  "book-open",
  "umbrella",
  "calendar",
  "monitor",
  "volume-2",
  "chart-line",
  "mail",
] as const;

// Stored values keep their original keys (and the "lucide" kind) so existing
// projects keep working; each key resolves to a Remix icon for display.
const PROJECT_ICON_REMIX: Record<(typeof PROJECT_LUCIDE_ALLOWLIST)[number], string> = {
  folder: "folder-line",
  "circle-dollar-sign": "money-dollar-circle-line",
  lightbulb: "lightbulb-line",
  image: "image-line",
  play: "play-circle-line",
  music: "music-2-line",
  sparkles: "sparkling-2-line",
  pencil: "pencil-line",
  briefcase: "briefcase-line",
  globe: "global-line",
  "graduation-cap": "graduation-cap-line",
  wallet: "wallet-3-line",
  heart: "heart-line",
  circle: "checkbox-blank-circle-line",
  utensils: "restaurant-line",
  coffee: "cup-line",
  "code-xml": "code-s-slash-line",
  leaf: "leaf-line",
  cat: "bear-smile-line",
  dog: "footprint-line",
  car: "car-line",
  "book-open": "book-open-line",
  umbrella: "umbrella-line",
  calendar: "calendar-line",
  monitor: "computer-line",
  "volume-2": "volume-up-line",
  "chart-line": "line-chart-line",
  mail: "mail-line",
};

export function projectIconName(value: string) {
  return `i-ri-${PROJECT_ICON_REMIX[value as keyof typeof PROJECT_ICON_REMIX] ?? "folder-line"}`;
}

export const PROJECT_ICON_COLORS = [
  { key: "neutral", className: "text-highlighted", swatch: "bg-inverted" },
  { key: "red", className: "text-red-500", swatch: "bg-red-500" },
  { key: "orange", className: "text-orange-500", swatch: "bg-orange-500" },
  { key: "emerald", className: "text-emerald-500", swatch: "bg-emerald-500" },
  { key: "sky", className: "text-sky-500", swatch: "bg-sky-500" },
  { key: "blue", className: "text-blue-500", swatch: "bg-blue-500" },
  { key: "violet", className: "text-violet-500", swatch: "bg-violet-500" },
] as const;

export type ProjectIconKind = "emoji" | "lucide";
export type ProjectIconColor = (typeof PROJECT_ICON_COLORS)[number]["key"];

export const PROJECT_QUICK_SUGGESTIONS = [
  { key: "work", emoji: "💼" },
  { key: "personal", emoji: "🏠" },
  { key: "study", emoji: "📚" },
  { key: "travel", emoji: "✈️" },
] as const;

export function isAllowedProjectIcon(kind: ProjectIconKind, value: string) {
  if (kind === "emoji") {
    return (PROJECT_EMOJI_ALLOWLIST as readonly string[]).includes(value);
  }
  return (PROJECT_LUCIDE_ALLOWLIST as readonly string[]).includes(value);
}

export function isAllowedProjectIconColor(color: string): color is ProjectIconColor {
  return PROJECT_ICON_COLORS.some((item) => item.key === color);
}

export function projectIconColorClass(color: string | null | undefined) {
  const match = PROJECT_ICON_COLORS.find((item) => item.key === color);
  return match?.className ?? PROJECT_ICON_COLORS[0].className;
}
