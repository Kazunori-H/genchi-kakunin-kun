'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Inspection {
  id: string
  inspection_date: string
  status: string
  overview_metadata?: {
    time?: { start_time: string; end_time: string }
    attendees?: Array<{ name: string; organization: string; position: string }>
  }
  sites: {
    name: string
    address: string | null
    facility_types: string[] | null
  }
  templates: {
    name: string
    template_items: Array<{
      id: string
      label: string
      item_type: string
      required: boolean
    }>
  }
  inspector: {
    name: string
    email: string
  }
  inspection_items: Array<{
    id: string
    template_item_id: string
    value: string | null
    metadata: Record<string, unknown> | null
  }>
}

const getNoteFromMetadata = (metadata: Record<string, unknown> | null) => {
  if (!metadata || typeof metadata !== 'object') return null
  const note = (metadata as { note?: string }).note
  return note && note.trim().length > 0 ? note : null
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    draft: '下書き',
    submitted: '申請中',
    approved: '承認済み',
    rejected: '却下',
  }
  return labels[status] || status
}

const getFacilityTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    transport: '運搬',
    transfer_storage: '積替保管',
    intermediate_treatment: '中間処理',
    final_disposal: '最終処分',
  }
  return labels[type] || type
}

export default function InspectionPrintPage() {
  const params = useParams<{ id: string }>()
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchInspection = useCallback(async () => {
    try {
      const response = await fetch(`/api/inspections/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setInspection(data)
    } catch (err) {
      console.error('Failed to fetch inspection', err)
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchInspection()
  }, [fetchInspection])

  useEffect(() => {
    if (!isLoading && inspection) {
      // データ読み込み後、自動的に印刷ダイアログを表示
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [isLoading, inspection])

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <p>読み込み中...</p>
      </div>
    )
  }

  if (!inspection) {
    return (
      <div className="p-8 text-center">
        <p>確認記録が見つかりません</p>
      </div>
    )
  }

  const items = inspection.inspection_items || []
  const totalItems = items.length
  const answeredItems = items.filter((item) => item.value).length
  const completionRate = totalItems > 0 ? (answeredItems / totalItems) * 100 : 0

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            margin: 20mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
        }

        @media screen {
          .print-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
        }
      `}</style>

      <div className="print-container">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">現地確認報告書</h1>
          <p className="text-center text-sm text-gray-600">
            作成日: {new Date().toLocaleDateString('ja-JP')}
          </p>
        </div>

        {/* 基本情報 */}
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3 pb-2 border-b-2 border-gray-800">
            基本情報
          </h2>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <th className="bg-gray-100 p-2 text-left w-1/3">確認先</th>
                <td className="p-2">{inspection.sites.name}</td>
              </tr>
              <tr className="border-b">
                <th className="bg-gray-100 p-2 text-left">住所</th>
                <td className="p-2">{inspection.sites.address || '-'}</td>
              </tr>
              <tr className="border-b">
                <th className="bg-gray-100 p-2 text-left">施設種別</th>
                <td className="p-2">
                  {inspection.sites.facility_types
                    ?.map(getFacilityTypeLabel)
                    .join(', ') || '-'}
                </td>
              </tr>
              <tr className="border-b">
                <th className="bg-gray-100 p-2 text-left">確認日</th>
                <td className="p-2">
                  {new Date(inspection.inspection_date).toLocaleDateString('ja-JP')}
                </td>
              </tr>
              <tr className="border-b">
                <th className="bg-gray-100 p-2 text-left">確認者</th>
                <td className="p-2">
                  {inspection.inspector.name || inspection.inspector.email}
                </td>
              </tr>
              <tr className="border-b">
                <th className="bg-gray-100 p-2 text-left">ステータス</th>
                <td className="p-2">{getStatusLabel(inspection.status)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 時刻情報 */}
        {inspection.overview_metadata?.time && (
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 pb-2 border-b-2 border-gray-800">
              確認時刻
            </h2>
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b">
                  <th className="bg-gray-100 p-2 text-left w-1/3">開始時刻</th>
                  <td className="p-2">
                    {inspection.overview_metadata.time.start_time || '-'}
                  </td>
                </tr>
                <tr className="border-b">
                  <th className="bg-gray-100 p-2 text-left">終了時刻</th>
                  <td className="p-2">
                    {inspection.overview_metadata.time.end_time || '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* 立会者情報 */}
        {inspection.overview_metadata?.attendees &&
          inspection.overview_metadata.attendees.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xl font-bold mb-3 pb-2 border-b-2 border-gray-800">
                立会者
              </h2>
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">氏名</th>
                    <th className="border p-2 text-left">所属</th>
                    <th className="border p-2 text-left">役職</th>
                  </tr>
                </thead>
                <tbody>
                  {inspection.overview_metadata.attendees.map((att, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="border p-2">{att.name || '-'}</td>
                      <td className="border p-2">{att.organization || '-'}</td>
                      <td className="border p-2">{att.position || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

        {/* 確認結果サマリー */}
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3 pb-2 border-b-2 border-gray-800">
            確認結果サマリー
          </h2>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <th className="bg-gray-100 p-2 text-left w-1/3">総項目数</th>
                <td className="p-2">{totalItems}</td>
              </tr>
              <tr className="border-b">
                <th className="bg-gray-100 p-2 text-left">回答済み項目数</th>
                <td className="p-2">{answeredItems}</td>
              </tr>
              <tr className="border-b">
                <th className="bg-gray-100 p-2 text-left">完了率</th>
                <td className="p-2">{completionRate.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* チェック項目詳細 */}
        <section className="mb-6 page-break">
          <h2 className="text-xl font-bold mb-3 pb-2 border-b-2 border-gray-800">
            チェック項目詳細
          </h2>
          <table className="w-full border-collapse border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left" style={{ width: '5%' }}>
                  No.
                </th>
                <th className="border p-2 text-left" style={{ width: '40%' }}>
                  項目
                </th>
                <th className="border p-2 text-left" style={{ width: '15%' }}>
                  評価
                </th>
                <th className="border p-2 text-left" style={{ width: '35%' }}>
                  メモ
                </th>
                <th className="border p-2 text-center" style={{ width: '5%' }}>
                  必須
                </th>
              </tr>
            </thead>
            <tbody>
              {inspection.inspection_items.map((item, idx) => {
                const templateItem = inspection.templates.template_items.find(
                  (ti) => ti.id === item.template_item_id
                )
                const note = getNoteFromMetadata(item.metadata)
                return (
                  <tr key={item.id} className="border-b">
                    <td className="border p-2 text-center">{idx + 1}</td>
                    <td className="border p-2">{templateItem?.label || '-'}</td>
                    <td className="border p-2">{item.value || '-'}</td>
                    <td className="border p-2 text-xs">{note || '-'}</td>
                    <td className="border p-2 text-center">
                      {templateItem?.required ? '○' : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* フッター */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
          <p>以上</p>
        </div>
      </div>
    </>
  )
}
