export type InspectionStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected'

export type TemplateItemType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'number'
  | 'date'
  | 'photo'
  | 'section_header'
  | 'rating_1_5_na'

export interface TemplateItemRecord {
  id: string
  item_type: TemplateItemType
  label: string
  description: string | null
  options: Record<string, unknown> | null
  required: boolean
  sort_order: number
}

export interface InspectionItemRecord {
  id: string
  inspection_id?: string
  template_item_id: string
  value: string | null
  metadata: Record<string, unknown> | null
}

export interface PhotoRecord {
  id: string
  inspection_id: string
  inspection_item_id: string | null
  template_item_id?: string | null
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
  sort_order: number | null
  uploaded_at: string
  public_url?: string
}

export interface InspectionDetailRecord {
  id: string
  organization_id: string
  template_id: string
  status: InspectionStatus
  summary: string | null
  inspection_date: string
  overview_metadata: Record<string, unknown> | null
  sites: {
    id: string
    name: string
    address: string | null
  }
  templates: {
    id: string
    name: string
    template_items: TemplateItemRecord[]
  }
  inspector: {
    id: string
    name: string
    email: string
  }
  inspection_items: InspectionItemRecord[]
  photos?: PhotoRecord[]
}

export interface InspectionSubmitRecord {
  id: string
  status: InspectionStatus
  templates: {
    template_items: TemplateItemRecord[]
  }
  inspection_items: InspectionItemRecord[]
}

export interface InspectionUpdatePayload {
  summary?: string | null
  inspection_date?: string
  overview_metadata?: Record<string, unknown> | null
  items?: Array<{
    template_item_id: string
    value?: string | null
    metadata?: Record<string, unknown>
  }>
}

export interface InspectionFieldChange {
  before: unknown
  after: unknown
}

export interface InspectionEditLogRecord {
  id: string
  inspection_id: string
  editor_id: string
  action: string
  changed_fields: string[]
  changes: Record<string, InspectionFieldChange> | null
  created_at: string
}
