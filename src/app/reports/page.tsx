'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ReportStats {
  totalInspections: number
  draftCount: number
  submittedCount: number
  approvedCount: number
  rejectedCount: number
  avgCompletionRate: number
}

interface InspectionSummary {
  id: string
  inspection_date: string
  sites: {
    name: string
  }
  status: string
  completion_rate: number
}

interface EvaluationDistribution {
  rating: string
  count: number
}

type JsPDFWithAutoTable = InstanceType<typeof jsPDF> & {
  lastAutoTable?: {
    finalY?: number
  }
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [recentInspections, setRecentInspections] = useState<InspectionSummary[]>([])
  const [evaluationDistribution, setEvaluationDistribution] = useState<EvaluationDistribution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    try {
      // 統計データを取得
      const statsResponse = await fetch('/api/reports/stats')
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch stats')
      }
      const statsData = await statsResponse.json()
      setStats(statsData)

      // 最近の確認記録を取得
      const recentResponse = await fetch('/api/reports/recent?limit=10')
      if (!recentResponse.ok) {
        throw new Error('Failed to fetch recent inspections')
      }
      const recentData = await recentResponse.json()
      setRecentInspections(recentData)

      // 評価分布データを取得
      const distributionResponse = await fetch('/api/reports/evaluation-distribution')
      if (!distributionResponse.ok) {
        throw new Error('Failed to fetch evaluation distribution')
      }
      const distributionData = await distributionResponse.json()
      setEvaluationDistribution(distributionData)
    } catch (err) {
      console.error('Failed to fetch report data', err)
      setError('レポートデータの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const handleCsvExport = async () => {
    try {
      const response = await fetch('/api/reports/export/csv')
      if (!response.ok) {
        throw new Error('Failed to export CSV')
      }

      // CSVファイルをダウンロード
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inspections_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to export CSV', err)
      alert('CSV出力に失敗しました')
    }
  }

  const handlePdfExport = async () => {
    try {
      // PDFドキュメントを作成
      const doc = new jsPDF()

      // タイトル
      doc.setFontSize(18)
      doc.text('Inspection Report', 14, 20)

      // 日付
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString('ja-JP')}`, 14, 28)

      // 統計サマリー
      doc.setFontSize(14)
      doc.text('Statistics Summary', 14, 40)

      const statsData = [
        ['Total Inspections', stats?.totalInspections?.toString() || '0'],
        ['Draft', stats?.draftCount?.toString() || '0'],
        ['Submitted', stats?.submittedCount?.toString() || '0'],
        ['Approved', stats?.approvedCount?.toString() || '0'],
        ['Rejected', stats?.rejectedCount?.toString() || '0'],
        ['Average Completion Rate', `${stats?.avgCompletionRate?.toFixed(1) || '0'}%`],
      ]

      autoTable(doc, {
        startY: 45,
        head: [['Metric', 'Value']],
        body: statsData,
        theme: 'grid',
      })

      // 評価分布
      const lastAutoTable = (doc as JsPDFWithAutoTable).lastAutoTable
      const finalY = lastAutoTable?.finalY ?? 100
      doc.setFontSize(14)
      doc.text('Evaluation Distribution', 14, finalY + 10)

      const distributionData = evaluationDistribution.map(item => [
        item.rating,
        item.count.toString()
      ])

      autoTable(doc, {
        startY: finalY + 15,
        head: [['Rating', 'Count']],
        body: distributionData,
        theme: 'grid',
      })

      // PDFをダウンロード
      doc.save(`inspection_report_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Failed to export PDF', err)
      alert('PDF出力に失敗しました')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">レポート</h1>
        <p className="mt-2 text-sm text-gray-600">
          確認記録の統計とサマリーを表示します
        </p>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">総確認記録数</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {stats?.totalInspections || 0}
              </p>
            </div>
            <div className="ml-4">
              <svg
                className="h-12 w-12 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">承認済み</p>
              <p className="mt-2 text-3xl font-semibold text-green-600">
                {stats?.approvedCount || 0}
              </p>
            </div>
            <div className="ml-4">
              <svg
                className="h-12 w-12 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">平均完了率</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {stats?.avgCompletionRate.toFixed(1) || 0}%
              </p>
            </div>
            <div className="ml-4">
              <svg
                className="h-12 w-12 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">下書き</p>
              <p className="mt-2 text-3xl font-semibold text-gray-600">
                {stats?.draftCount || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">申請中</p>
              <p className="mt-2 text-3xl font-semibold text-yellow-600">
                {stats?.submittedCount || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">却下</p>
              <p className="mt-2 text-3xl font-semibold text-red-600">
                {stats?.rejectedCount || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* グラフエリア - 評価分布 */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">評価分布</h2>
        {evaluationDistribution.length > 0 && evaluationDistribution.some(d => d.count > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={evaluationDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rating" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#4f46e5" name="回答数" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <p className="text-gray-500">データがありません</p>
          </div>
        )}
      </div>

      {/* エクスポート機能 */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">エクスポート</h2>
        <div className="flex gap-4">
          <button
            onClick={handlePdfExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            PDF出力
          </button>
          <button
            onClick={handleCsvExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            CSV出力
          </button>
        </div>
      </div>

      {/* 最近の確認記録 */}
      {recentInspections.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">最近の確認記録</h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {recentInspections.map((inspection) => (
              <li key={inspection.id} className="px-6 py-4 hover:bg-gray-50">
                <Link
                  href={`/inspections/${inspection.id}`}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600">
                      {inspection.sites.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(inspection.inspection_date).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inspection.status)}`}
                    >
                      {getStatusLabel(inspection.status)}
                    </span>
                    <span className="text-sm text-gray-500">
                      完了率: {inspection.completion_rate}%
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recentInspections.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            確認記録がありません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            まずは確認記録を作成してください
          </p>
          <div className="mt-6">
            <Link
              href="/inspections/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              新規作成
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
