import type { TemplateItemType } from './inspection'

export interface TemplateItemPayload {
  itemType: TemplateItemType
  label: string
  description?: string | null
  options?: Record<string, unknown>
  required?: boolean
  sortOrder?: number
  displayFacilityTypes?: string[]
}

export interface TemplatePayload {
  name: string
  description?: string | null
  category?: string | null
  isDefault?: boolean
  sortOrder?: number
  items?: TemplateItemPayload[]
}
