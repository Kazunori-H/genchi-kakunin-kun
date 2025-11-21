'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'

interface PendingInspection {
  id: string
  inspection_date: string
  submitted_at: string
  sites: {
    id: string
    name: string
    address: string | null
  }
  templates: {
    id: string
    name: string
  }
  inspector: {
    id: string
    name: string
  }
}

export default function ApprovalsPage() {
  const [inspections, setInspections] = useState<PendingInspection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canManageSettings, setCanManageSettings] = useState(false)

  useEffect(() => {
    fetchPendingInspections()
  }, [])

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!response.ok) {
          return
        }
        const data = await response.json()
        setCanManageSettings(data.role === 'admin')
      } catch (err) {
        console.error('Failed to fetch current user role', err)
      }
    }
    fetchRole()
  }, [])

  const fetchPendingInspections = async () => {
    try {
      const response = await fetch('/api/approvals/pending')
      if (!response.ok) {
        throw new Error('Failed to fetch pending inspections')
      }
      const data = await response.json()
      setInspections(data)
    } catch (err) {
      console.error('Failed to fetch pending inspections', err)
      setError('承認待ち一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
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
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">承認待ち確認記録</h1>
          <p className="mt-2 text-sm text-gray-600">
            承認待ちの確認記録一覧です。内容を確認し、承認・差し戻し・却下を行ってください。
          </p>
        </div>
        {canManageSettings && (
          <Link
            href="/settings/organization"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            組織設定
          </Link>
        )}
      </div>

      {inspections.length === 0 ? (
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            承認待ちの記録はありません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            すべての確認記録が処理されています
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {inspections.map((inspection) => (
              <li key={inspection.id}>
                <Link
                  href={`/inspections/${inspection.id}`}
                  className="block hover:bg-gray-50 transition"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {inspection.sites.name}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                          <span>
                            確認日:{' '}
                            {new Date(inspection.inspection_date).toLocaleDateString(
                              'ja-JP'
                            )}
                          </span>
                          <span>テンプレート: {inspection.templates.name}</span>
                          <span>確認者: {inspection.inspector.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          提出日時:{' '}
                          {new Date(inspection.submitted_at).toLocaleString('ja-JP')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status="pending_approval" />
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
      )}
    </div>
  )
}
