'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'

interface Inspection {
  id: string
  inspection_date: string
  status: string
  summary: string | null
  created_at: string
  site_id?: string
  sites: {
    id: string
    name: string
  }
  templates: {
    id: string
    name: string
  }
  inspector: {
    id: string
    name: string
    email: string
  }
}

interface SiteOption {
  id: string
  name: string
}

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sites, setSites] = useState<SiteOption[]>([])
  const [siteFilter, setSiteFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10
  const filteredInspections = useMemo(() => {
    return inspections.filter((inspection) => {
      if (statusFilter !== 'all' && inspection.status !== statusFilter) {
        return false
      }

      if (siteFilter !== 'all' && inspection.sites?.id !== siteFilter) {
        return false
      }

      if (startDate) {
        const inspectionDate = new Date(inspection.inspection_date)
        const start = new Date(startDate)
        if (inspectionDate < start) return false
      }

      if (endDate) {
        const inspectionDate = new Date(inspection.inspection_date)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        if (inspectionDate > end) return false
      }

      return true
    })
  }, [inspections, statusFilter, siteFilter, startDate, endDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, siteFilter, startDate, endDate])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredInspections.length / PAGE_SIZE)
  )

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedInspections = filteredInspections.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  useEffect(() => {
    fetchInspections()
  }, [])

  const fetchInspections = async () => {
    try {
      const response = await fetch('/api/inspections')
      if (!response.ok) {
        throw new Error('Failed to fetch inspections')
      }
      const data = await response.json()
      setInspections(data)
    } catch (err) {
      console.error('Failed to fetch inspections', err)
      setError('確認記録の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const response = await fetch('/api/sites')
        if (!response.ok) {
          throw new Error('Failed to fetch sites')
        }
        const data = (await response.json()) as SiteOption[]
        setSites(data)
      } catch (err) {
        console.error('Failed to fetch sites', err)
      }
    }
    fetchSites()
  }, [])

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
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">確認記録</h1>
        <Link
          href="/inspections/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          新規確認作成
        </Link>
      </div>

      {/* フィルター設定 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg
            className="w-5 h-5 mr-2 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          絞り込み条件
        </h2>

        {/* ステータスフィルター */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            ステータス
          </label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border ${
                statusFilter === 'draft'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              下書き
            </button>
            <button
              onClick={() => setStatusFilter('pending_approval')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border ${
                statusFilter === 'pending_approval'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              承認待ち
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border ${
                statusFilter === 'approved'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              承認済み
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border ${
                statusFilter === 'rejected'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              却下
            </button>
          </div>
        </div>

        {/* 詳細フィルター */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <svg
                className="w-4 h-4 inline mr-1.5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              現地確認先
            </label>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value="all">すべて</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <svg
                className="w-4 h-4 inline mr-1.5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              開始日
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <svg
                className="w-4 h-4 inline mr-1.5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              終了日
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
        </div>

        {/* クリアボタン */}
        {(statusFilter !== 'all' || siteFilter !== 'all' || startDate || endDate) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setStatusFilter('all')
                setSiteFilter('all')
                setStartDate('')
                setEndDate('')
              }}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              すべてクリア
            </button>
          </div>
        )}
      </div>

      {filteredInspections.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
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
            新しい現地確認を開始してください
          </p>
          <div className="mt-6">
            <Link
              href="/inspections/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              新規確認作成
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {paginatedInspections.map((inspection) => (
                <li key={inspection.id}>
                  <Link
                    href={`/inspections/${inspection.id}`}
                    className="block hover:bg-gray-50 transition"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                              {inspection.sites.name}
                            </p>
                            <StatusBadge
                              status={inspection.status as 'draft' | 'pending_approval' | 'approved' | 'rejected'}
                            />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="inline-flex items-center">
                              <svg
                                className="mr-1.5 h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              {new Date(inspection.inspection_date).toLocaleDateString(
                                'ja-JP'
                              )}
                            </span>
                            <span className="inline-flex items-center">
                              <svg
                                className="mr-1.5 h-4 w-4"
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
                              {inspection.templates.name}
                            </span>
                            <span className="inline-flex items-center">
                              <svg
                                className="mr-1.5 h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              {inspection.inspector.name}
                            </span>
                          </div>
                          {inspection.summary && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                              {inspection.summary}
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          <svg
                            className="h-5 w-5 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between mt-4">
            <p className="text-sm text-gray-600 text-center sm:text-left">
              {filteredInspections.length}件中{' '}
              {(currentPage - 1) * PAGE_SIZE + 1}-
              {Math.min(currentPage * PAGE_SIZE, filteredInspections.length)}件を表示
            </p>
            <div className="flex justify-center sm:justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                前へ
              </button>
              <span className="px-4 py-2 text-sm text-gray-600 flex items-center">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                次へ
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
