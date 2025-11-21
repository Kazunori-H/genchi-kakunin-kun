import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getPublicStorageUrl } from '@/lib/storage'
import type {
  InspectionDetailRecord,
  InspectionUpdatePayload,
  InspectionFieldChange,
} from '@/types/inspection'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ユーザーの所属組織IDを取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 確認記録を取得（組織の確認）
  const { data: inspection, error } = await supabase
    .from('inspections')
    .select(`
      *,
      sites (
        id,
        name,
        address
      ),
      templates (
        id,
        name,
        template_items (
          id,
          item_type,
          label,
          description,
          options,
          required,
          sort_order
        )
      ),
      inspector:users!inspector_id (
        id,
        name,
        email
      ),
      inspection_items (
        id,
        template_item_id,
        value,
        metadata
      ),
      photos (
        id,
        inspection_item_id,
        file_path,
        file_name,
        file_size,
        mime_type,
        edited_data,
        sort_order,
        uploaded_at
      )
    `)
    .eq('id', id)
    .eq('organization_id', userData.organization_id)
    .single<InspectionDetailRecord>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!inspection) {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
  }

  const inspectionItemToTemplateMap = new Map<string, string>(
    (inspection.inspection_items || []).map((item) => [
      item.id,
      item.template_item_id,
    ])
  )

  const photos =
    inspection.photos?.map((photo) => {
      const templateItemId = photo.inspection_item_id
        ? inspectionItemToTemplateMap.get(photo.inspection_item_id) || null
        : null

      return {
        ...photo,
        template_item_id: templateItemId,
        public_url: getPublicStorageUrl(photo.file_path),
      }
    }) ?? []

  return NextResponse.json({
    ...inspection,
    photos,
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ユーザーの所属組織IDを取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = (await request.json()) as InspectionUpdatePayload

  // まず現在のinspectionを取得（ステータス確認のため）
  const { data: currentInspection, error: fetchError } = await supabase
    .from('inspections')
    .select('id, status, inspector_id, summary, inspection_date, overview_metadata')
    .eq('id', id)
    .eq('organization_id', userData.organization_id)
    .single<{
      id: string
      status: string
      inspector_id: string
      summary: string | null
      inspection_date: string
      overview_metadata: Record<string, unknown> | null
    }>()

  if (fetchError || !currentInspection) {
    return NextResponse.json(
      { error: 'Inspection not found' },
      { status: 404 }
    )
  }

  // 下書き以外は編集不可
  if (currentInspection.status !== 'draft') {
    return NextResponse.json(
      { error: '下書き以外の確認記録は編集できません' },
      { status: 400 }
    )
  }

  // チェック項目の保存
  if (body.items && Array.isArray(body.items) && body.items.length > 0) {
    const upsertPayload = body.items.map((item) => ({
      inspection_id: id,
      template_item_id: item.template_item_id,
      value: item.value ?? null,
      metadata: item.metadata || {},
    }))

    const { error: itemsError } = await supabase
      .from('inspection_items')
      .upsert(upsertPayload, {
        onConflict: 'inspection_id,template_item_id',
      })

    if (itemsError) {
      return NextResponse.json(
        { error: `Failed to save items: ${itemsError.message}` },
        { status: 500 }
      )
    }
  }

  // サマリー、確認実施日、概要メタデータを更新（ステータスは変更しない）
  const updateData: Partial<{
    summary: string | null
    inspection_date: string
    overview_metadata: Record<string, unknown> | null
  }> = {}
  const changedFields: string[] = []
  const changes: Record<string, InspectionFieldChange> = {}

  const trackChange = (field: string, before: unknown, after: unknown) => {
    changedFields.push(field)
    changes[field] = { before, after }
  }

  if (body.summary !== undefined) {
    updateData.summary = body.summary
    if (body.summary !== currentInspection.summary) {
      trackChange('summary', currentInspection.summary, body.summary)
    }
  }
  if (body.inspection_date !== undefined) {
    updateData.inspection_date = body.inspection_date
    if (body.inspection_date !== currentInspection.inspection_date) {
      trackChange(
        'inspection_date',
        currentInspection.inspection_date,
        body.inspection_date
      )
    }
  }
  if (body.overview_metadata !== undefined) {
    updateData.overview_metadata = body.overview_metadata
    const prevOverview = currentInspection.overview_metadata ?? null
    const nextOverview = body.overview_metadata ?? null
    if (JSON.stringify(prevOverview) !== JSON.stringify(nextOverview)) {
      trackChange('overview_metadata', prevOverview, nextOverview)
    }
  }

  const { data: inspection, error: inspectionError } = await supabase
    .from('inspections')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', userData.organization_id)
    .select()
    .single()

  if (inspectionError) {
    return NextResponse.json(
      { error: inspectionError.message },
      { status: 500 }
    )
  }

  if (changedFields.length > 0) {
    const { error: logError } = await supabase
      .from('inspection_edit_logs')
      .insert({
        inspection_id: id,
        editor_id: user.id,
        action: 'update_overview',
        changed_fields: changedFields,
        changes,
      })

    if (logError) {
      console.error('Failed to record inspection edit log', logError)
    }
  }

  return NextResponse.json(inspection)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ユーザーの所属組織IDを取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 確認記録を取得（ステータスと作成者の確認）
  const { data: inspection, error: fetchError } = await supabase
    .from('inspections')
    .select('id, status, inspector_id')
    .eq('id', id)
    .eq('organization_id', userData.organization_id)
    .single<{ id: string; status: string; inspector_id: string }>()

  if (fetchError || !inspection) {
    return NextResponse.json(
      { error: 'Inspection not found' },
      { status: 404 }
    )
  }

  // 下書き以外は削除不可
  if (inspection.status !== 'draft') {
    return NextResponse.json(
      { error: '下書きの確認記録のみ削除できます' },
      { status: 403 }
    )
  }

  // 作成者以外は削除不可
  if (inspection.inspector_id !== user.id) {
    return NextResponse.json(
      { error: '作成者のみ削除できます' },
      { status: 403 }
    )
  }

  // 確認記録を削除
  const { error } = await supabase
    .from('inspections')
    .delete()
    .eq('id', id)
    .eq('organization_id', userData.organization_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
