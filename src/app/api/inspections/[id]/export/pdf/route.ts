import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// 日本語対応のため、フォントの代わりに画像ベースの表現を使用
// または、英語ラベルを使用して日本語は避ける
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await context.params

    // ユーザー認証確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 確認記録を取得
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .select(
        `
        id,
        inspection_date,
        status,
        overview_metadata,
        created_at,
        sites (
          name,
          address,
          facility_types
        ),
        templates (
          name,
          template_items (
            id,
            label,
            item_type,
            required
          )
        ),
        inspector:users!inspector_id (
          name,
          email
        ),
        inspection_items (
          id,
          template_item_id,
          value,
          metadata
        )
      `
      )
      .eq('id', id)
      .single()

    if (inspectionError || !inspection) {
      console.error('Error fetching inspection:', inspectionError)
      return NextResponse.json(
        { error: 'Inspection not found', details: inspectionError?.message },
        { status: 404 }
      )
    }

    type JsPDFWithAutoTable = InstanceType<typeof jsPDF> & {
      lastAutoTable?: {
        finalY?: number
      }
    }

    // PDFを生成
    const doc = new jsPDF()

    // タイトル
    doc.setFontSize(18)
    doc.text('Inspection Report', 14, 20)

    // 基本情報
    doc.setFontSize(10)
    const site = Array.isArray(inspection.sites)
      ? inspection.sites[0]
      : inspection.sites
    const inspector = Array.isArray(inspection.inspector)
      ? inspection.inspector[0]
      : inspection.inspector
    const basicInfo = [
      ['Site', site?.name || 'N/A'],
      ['Address', site?.address || 'N/A'],
      [
        'Facility Types',
        Array.isArray(site?.facility_types)
          ? site.facility_types.join(', ')
          : 'N/A',
      ],
      [
        'Inspection Date',
        new Date(inspection.inspection_date).toLocaleDateString('ja-JP'),
      ],
      [
        'Inspector',
        inspector?.name || inspector?.email || 'N/A',
      ],
      ['Status', inspection.status],
    ]

    autoTable(doc, {
      startY: 30,
      head: [['Field', 'Value']],
      body: basicInfo,
      theme: 'grid',
    })

    // 概要情報
    const lastAutoTable1 = (doc as JsPDFWithAutoTable).lastAutoTable
    let currentY = lastAutoTable1?.finalY ?? 80

    if (inspection.overview_metadata) {
      const metadata = inspection.overview_metadata as {
        time?: { start_time: string; end_time: string }
        attendees?: Array<{ name: string; organization: string; position: string }>
      }

      if (metadata.time) {
        doc.setFontSize(12)
        doc.text('Time Information', 14, currentY + 10)

        autoTable(doc, {
          startY: currentY + 15,
          head: [['Start Time', 'End Time']],
          body: [[metadata.time.start_time || '-', metadata.time.end_time || '-']],
          theme: 'grid',
        })

        const lastAutoTable2 = (doc as JsPDFWithAutoTable).lastAutoTable
        currentY = lastAutoTable2?.finalY ?? currentY + 30
      }

      if (metadata.attendees && metadata.attendees.length > 0) {
        doc.setFontSize(12)
        doc.text('Attendees', 14, currentY + 10)

        const attendeesData = metadata.attendees.map((att) => [
          att.name || '-',
          att.organization || '-',
          att.position || '-',
        ])

        autoTable(doc, {
          startY: currentY + 15,
          head: [['Name', 'Organization', 'Position']],
          body: attendeesData,
          theme: 'grid',
        })

        const lastAutoTable3 = (doc as JsPDFWithAutoTable).lastAutoTable
        currentY = lastAutoTable3?.finalY ?? currentY + 30
      }
    }

    // チェック項目の結果
    const items = inspection.inspection_items || []
    const totalItems = items.length
    const answeredItems = items.filter((item) => item.value).length
    const completionRate = totalItems > 0 ? (answeredItems / totalItems) * 100 : 0

    doc.setFontSize(12)
    doc.text('Summary Statistics', 14, currentY + 10)

    autoTable(doc, {
      startY: currentY + 15,
      head: [['Metric', 'Value']],
      body: [
        ['Total Items', totalItems.toString()],
        ['Answered Items', answeredItems.toString()],
        ['Completion Rate', `${completionRate.toFixed(1)}%`],
      ],
      theme: 'grid',
    })

    const lastAutoTable4 = (doc as JsPDFWithAutoTable).lastAutoTable
    currentY = lastAutoTable4?.finalY ?? currentY + 50

    // チェック項目詳細（英語ラベル使用）
    doc.setFontSize(12)
    doc.text('Inspection Items', 14, currentY + 10)

    const template =
      (Array.isArray(inspection.templates)
        ? inspection.templates[0]
        : inspection.templates) || null
    const templateItems = template?.template_items ?? []

    const itemsData = inspection.inspection_items.map((item) => {
      const templateItem = templateItems.find(
        (ti) => ti.id === item.template_item_id
      )

      // メモの取得
      let note = '-'
      if (item.metadata && typeof item.metadata === 'object') {
        const metadata = item.metadata as { note?: string }
        note = metadata.note || '-'
      }

      return [
        templateItem?.label || 'N/A',
        item.value || '-',
        note,
        templateItem?.required ? 'Yes' : 'No',
      ]
    })

    autoTable(doc, {
      startY: currentY + 15,
      head: [['Item Label', 'Response', 'Note', 'Required']],
      body: itemsData,
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30 },
        2: { cellWidth: 70 },
        3: { cellWidth: 25 },
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
    })

    // PDFをバッファとして取得
    const pdfBuffer = doc.output('arraybuffer')

    // レスポンスヘッダーを設定
    const filename = `inspection_${id}_${new Date().toISOString().split('T')[0]}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: errorMessage },
      { status: 500 }
    )
  }
}
