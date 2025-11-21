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

    // 組織の確認記録IDを取得
    const { data: inspections, error: inspectionsError } = await supabase
      .from('inspections')
      .select('id')
      .eq('organization_id', userData.organization_id)

    if (inspectionsError) {
      console.error('Failed to fetch inspections:', inspectionsError)
      return NextResponse.json(
        { error: 'Failed to fetch inspections' },
        { status: 500 }
      )
    }

    const inspectionIds = inspections.map((i) => i.id)

    if (inspectionIds.length === 0) {
      // データがない場合は空の分布を返す
      return NextResponse.json([
        { rating: '1', count: 0 },
        { rating: '2', count: 0 },
        { rating: '3', count: 0 },
        { rating: '4', count: 0 },
        { rating: '5', count: 0 },
        { rating: '該当なし', count: 0 },
      ])
    }

    // 確認記録の回答を取得
    const { data: responses, error: responsesError } = await supabase
      .from('inspection_responses')
      .select('response_value')
      .in('inspection_id', inspectionIds)
      .not('response_value', 'is', null)

    if (responsesError) {
      console.error('Failed to fetch responses:', responsesError)
      return NextResponse.json(
        { error: 'Failed to fetch responses' },
        { status: 500 }
      )
    }

    // 評価の分布を集計
    const distribution: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '該当なし': 0,
    }

    responses.forEach((response) => {
      const value = response.response_value
      if (value === 'N/A' || value === 'n/a') {
        distribution['該当なし']++
      } else if (value && ['1', '2', '3', '4', '5'].includes(value)) {
        distribution[value]++
      }
    })

    // 配列形式に変換
    const result = Object.entries(distribution).map(([rating, count]) => ({
      rating,
      count,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching evaluation distribution:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
