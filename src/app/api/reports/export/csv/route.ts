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

    // 確認記録と関連データを取得
    const { data: inspections, error: inspectionsError } = await supabase
      .from('inspections')
      .select(
        `
        id,
        inspection_date,
        status,
        completion_rate,
        overview_metadata,
        created_at,
        sites (
          name,
          facility_types
        ),
        templates (
          name
        ),
        inspector:users!inspector_id (
          name,
          email
        )
      `
      )
      .eq('organization_id', userData.organization_id)
      .order('inspection_date', { ascending: false })

    if (inspectionsError) {
      console.error('Failed to fetch inspections:', inspectionsError)
      return NextResponse.json(
        { error: 'Failed to fetch inspections' },
        { status: 500 }
      )
    }

    // CSVヘッダー
    const headers = [
      'ID',
      '確認日',
      '現地確認先',
      '施設種別',
      'テンプレート',
      '確認者',
      'ステータス',
      '完了率(%)',
      '確認時刻',
      '立会者',
      '作成日時',
    ]

    // CSVデータを生成
    const csvRows = [headers.join(',')]

    inspections.forEach((inspection) => {
      const row = [
        inspection.id,
        inspection.inspection_date,
        inspection.sites?.name || '',
        Array.isArray(inspection.sites?.facility_types)
          ? inspection.sites.facility_types.join(';')
          : '',
        inspection.templates?.name || '',
        inspection.inspector?.name || inspection.inspector?.email || '',
        getStatusLabel(inspection.status),
        inspection.completion_rate?.toString() || '0',
        inspection.overview_metadata?.inspection_time || '',
        inspection.overview_metadata?.attendees || '',
        new Date(inspection.created_at).toLocaleDateString('ja-JP'),
      ]

      // CSVエスケープ処理（カンマやダブルクォートを含む場合）
      const escapedRow = row.map((field) => {
        const fieldStr = String(field)
        if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
          return `"${fieldStr.replace(/"/g, '""')}"`
        }
        return fieldStr
      })

      csvRows.push(escapedRow.join(','))
    })

    const csvContent = csvRows.join('\n')

    // BOM付きUTF-8でエクスポート（Excelで正しく開けるように）
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    // レスポンスヘッダーを設定
    const filename = `inspections_${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting CSV:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: '下書き',
    submitted: '申請中',
    approved: '承認済み',
    rejected: '却下',
  }
  return labels[status] || status
}
