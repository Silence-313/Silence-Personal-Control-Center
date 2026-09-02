/** Join truthy class names. Kept dependency-free on purpose. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}