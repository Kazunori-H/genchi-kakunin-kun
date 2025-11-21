import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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

    // クエリパラメータから件数を取得（デフォルト10件）
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // 最近の確認記録を取得
    const { data: inspections, error: inspectionsError } = await supabase
      .from('inspections')
      .select(
        `
        id,
        inspection_date,
        status,
        completion_rate,
        sites (
          name
        )
      `
      )
      .eq('organization_id', userData.organization_id)
      .order('inspection_date', { ascending: false })
      .limit(limit)

    if (inspectionsError) {
      console.error('Failed to fetch recent inspections:', inspectionsError)
      return NextResponse.json(
        { error: 'Failed to fetch recent inspections' },
        { status: 500 }
      )
    }

    return NextResponse.json(inspections)
  } catch (error) {
    console.error('Error fetching recent inspections:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
