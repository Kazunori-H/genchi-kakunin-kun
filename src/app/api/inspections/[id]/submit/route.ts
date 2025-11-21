import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import type { InspectionSubmitRecord } from '@/types/inspection'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 確認記録の取得と権限チェック
  const { data: inspection, error: fetchError } = await supabase
    .from('inspections')
    .select('*, inspection_items(*), templates!inner(template_items(*))')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .eq('inspector_id', user.id)
    .single<InspectionSubmitRecord>()

  if (fetchError || !inspection) {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
  }

  if (inspection.status !== 'draft') {
    return NextResponse.json(
      { error: 'Only draft inspections can be submitted' },
      { status: 400 }
    )
  }

  // 必須項目のチェック
  const requiredItems = inspection.templates.template_items.filter(
    (item) => item.required && item.item_type !== 'section_header'
  )

  const filledItems = inspection.inspection_items.filter(
    (item) => item.value !== null && item.value !== ''
  )

  const missingItems = requiredItems.filter(
    (req) =>
      !filledItems.find((filled) => filled.template_item_id === req.id)
  )

  if (missingItems.length > 0) {
    return NextResponse.json(
      { error: `必須項目が入力されていません（${missingItems.length}件）` },
      { status: 400 }
    )
  }

  // 組織の承認者を取得
  const { data: orgSettings } = await supabase
    .from('organization_settings')
    .select('default_approver_id')
    .eq('organization_id', user.organization_id)
    .single<{ default_approver_id: string | null }>()

  // ステータス更新
  const { data: updatedInspection, error: updateError } = await supabase
    .from('inspections')
    .update({
      status: 'pending_approval',
      submitted_at: new Date().toISOString(),
      approver_id: orgSettings?.default_approver_id || null,
    })
    .eq('id', id)
    .eq('inspector_id', user.id)
    .eq('organization_id', user.organization_id)
    .select()
    .single()

  if (updateError) {
    console.error('Submit error:', updateError)
    return NextResponse.json(
      {
        error: updateError.message,
        details: process.env.NODE_ENV === 'development' ? updateError : undefined
      },
      { status: 500 }
    )
  }

  if (!updatedInspection) {
    return NextResponse.json(
      { error: 'Failed to update inspection status' },
      { status: 500 }
    )
  }

  // 承認履歴の記録
  const { error: logError } = await supabase.from('approval_logs').insert({
    inspection_id: id,
    actor_id: user.id,
    action: 'submit',
    comment: null,
  })

  if (logError) {
    console.error('Failed to create approval log:', logError)
    // ログの記録に失敗してもステータス更新は成功しているので続行
  }

  return NextResponse.json(updatedInspection)
}
