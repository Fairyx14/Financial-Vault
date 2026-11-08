import { CATEGORIES, type CategoryId } from "@/lib/investments";

/**
 * Each category always uses the same colour slot (--cat-1 … --cat-8 in globals.css),
 * following the fixed category order. Colour follows the category, never its rank,
 * so filtering or switching views never repaints the remaining slices.
 */
export function categoryColor(id: CategoryId): string {
  const index = CATEGORIES.findIndex((category) => category.id === id);
  return `var(--cat-${index + 1})`;
}
