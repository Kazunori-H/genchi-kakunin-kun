import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentUser, checkPermission } from '@/lib/supabase/auth'
import type { InspectionStatus } from '@/types/inspection'

type ApprovalAction = 'approve' | 'return' | 'reject'

interface InspectionRecord {
  id: string
  status: InspectionStatus
  organization_id: string
}

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

  // 承認者権限チェック
  const hasPermission = await checkPermission('approver')
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json()) as {
    action: ApprovalAction
    comment?: string
  }
  const { action, comment } = body

  if (!['approve', 'return', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // 差し戻し・却下時はコメント必須
  if ((action === 'return' || action === 'reject') && !comment) {
    return NextResponse.json(
      { error: 'Comment is required for return/reject' },
      { status: 400 }
    )
  }

  // 確認記録の取得と権限チェック
  const { data: inspection, error: fetchError } = await supabase
    .from('inspections')
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single<InspectionRecord>()

  if (fetchError || !inspection) {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
  }

  if (inspection.status !== 'pending_approval') {
    return NextResponse.json(
      { error: 'Only pending inspections can be approved/rejected' },
      { status: 400 }
    )
  }

  // ステータスマッピング
  const statusMap: Record<string, string> = {
    approve: 'approved',
    return: 'draft',
    reject: 'rejected',
  }

  const newStatus = statusMap[action]

  // ステータス更新
  const updateData: {
    status: typeof newStatus
    approver_id: string
    approved_at?: string
  } = {
    status: newStatus,
    approver_id: user.id,
  }

  if (action === 'approve') {
    updateData.approved_at = new Date().toISOString()
  }

  const { data: updatedInspection, error: updateError } = await supabase
    .from('inspections')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // 承認履歴の記録
  await supabase.from('approval_logs').insert({
    inspection_id: id,
    actor_id: user.id,
    action,
    comment: comment || null,
  })

  return NextResponse.json(updatedInspection)
}
