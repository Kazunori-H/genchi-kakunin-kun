import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // ユーザー認証確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの組織IDを取得
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      )
    }

    // 確認記録の統計を取得
    const { data: inspections, error: inspectionsError } = await supabase
      .from('inspections')
      .select('id, status, completion_rate')
      .eq('organization_id', userData.organization_id)

    if (inspectionsError) {
      console.error('Failed to fetch inspections:', inspectionsError)
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      )
    }

    // ステータス別にカウント
    const totalInspections = inspections.length
    const draftCount = inspections.filter((i) => i.status === 'draft').length
    const submittedCount = inspections.filter(
      (i) => i.status === 'submitted'
    ).length
    const approvedCount = inspections.filter(
      (i) => i.status === 'approved'
    ).length
    const rejectedCount = inspections.filter(
      (i) => i.status === 'rejected'
    ).length

    // 平均完了率を計算
    const avgCompletionRate =
      totalInspections > 0
        ? inspections.reduce((sum, i) => sum + (i.completion_rate || 0), 0) /
          totalInspections
        : 0

    return NextResponse.json({
      totalInspections,
      draftCount,
      submittedCount,
      approvedCount,
      rejectedCount,
      avgCompletionRate,
    })
  } catch (error) {
    console.error('Error fetching report stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
