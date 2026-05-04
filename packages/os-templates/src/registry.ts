import type { Template, TemplateCategory } from './types.js'
import { builtInTemplates, TEMPLATES } from './gallery.js'

export { builtInTemplates, TEMPLATES }

export const findTemplate = (
  id: string,
  registry: readonly Template[] = builtInTemplates,
): Template | undefined => registry.find((t) => t.id === id)

export const listTemplates = (
  filter: { category?: TemplateCategory; tag?: string } = {},
  registry: readonly Template[] = builtInTemplates,
): readonly Template[] =>
  registry.filter((t) => {
    if (filter.category !== undefined && t.category !== filter.category) return false
    if (filter.tag !== undefined && !t.tags.includes(filter.tag)) return false
    return true
  })

export const allTags = (registry: readonly Template[] = builtInTemplates): readonly string[] => {
  const set = new Set<string>()
  for (const t of registry) for (const tag of t.tags) set.add(tag)
  return [...set].sort()
}

export const allCategories = (
  registry: readonly Template[] = builtInTemplates,
): readonly TemplateCategory[] => {
  const set = new Set<TemplateCategory>()
  for (const t of registry) set.add(t.category)
  return [...set]
}
