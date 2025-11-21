import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'

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
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .eq('inspector_id', user.id) // 自分が作成した確認記録のみ
    .single()

  if (fetchError || !inspection) {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
  }

  // 承認待ちのみ取り下げ可能
  if (inspection.status !== 'pending_approval') {
    return NextResponse.json(
      { error: '承認待ちの確認記録のみ取り下げできます' },
      { status: 400 }
    )
  }

  // ステータスを下書きに戻す
  const { data: updatedInspection, error: updateError } = await supabase
    .from('inspections')
    .update({
      status: 'draft',
      submitted_at: null,
      approver_id: null,
    })
    .eq('id', id)
    .eq('inspector_id', user.id)
    .eq('organization_id', user.organization_id)
    .select()
    .single()

  if (updateError) {
    console.error('Withdraw error:', updateError)
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
      { error: 'Failed to withdraw inspection' },
      { status: 500 }
    )
  }

  // 承認履歴の記録
  const { error: logError } = await supabase.from('approval_logs').insert({
    inspection_id: id,
    actor_id: user.id,
    action: 'withdraw',
    comment: null,
  })

  if (logError) {
    console.error('Failed to create approval log:', logError)
    // ログの記録に失敗してもステータス更新は成功しているので続行
  }

  return NextResponse.json(updatedInspection)
}
