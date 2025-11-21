'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface TemplateItem {
  id: string
  item_type: string
  label: string
  description: string | null
  options: Record<string, unknown> | null
  required: boolean
  sort_order: number
}

interface Template {
  id: string
  name: string
  description: string | null
  category: string | null
  is_default: boolean
  is_system_template: boolean
  sort_order: number
  created_at: string
  template_items: TemplateItem[]
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/templates')
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      const data = await response.json()
      setTemplates(data)
    } catch (err) {
      console.error('Failed to fetch templates', err)
      setError('テンプレートの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleDuplicate = async (id: string, name: string) => {
    if (!confirm(`「${name}」を複製しますか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/templates/${id}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate template')
      }

      const newTemplate = await response.json()
      // 複製成功後、新しいテンプレートの詳細ページに遷移
      router.push(`/templates/${newTemplate.id}`)
      router.refresh()
    } catch (err) {
      console.error('Failed to duplicate template', err)
      const message =
        err instanceof Error ? err.message : 'テンプレートの複製に失敗しました'
      alert(message)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？この操作は取り消せません。`)) {
      return
    }

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete template')
      }

      // 削除成功後、リストを再取得
      fetchTemplates()
    } catch (err) {
      console.error('Failed to delete template', err)
      const message =
        err instanceof Error ? err.message : 'テンプレートの削除に失敗しました'
      alert(message)
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
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          チェックシートテンプレート
        </h1>
        <Link
          href="/templates/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          新規作成
        </Link>
      </div>

      {templates.length === 0 ? (
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
            テンプレートがありません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            新しいチェックシートテンプレートを作成してください
          </p>
          <div className="mt-6">
            <Link
              href="/templates/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              新規作成
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {templates.map((template) => (
              <li key={template.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/templates/${template.id}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          {template.name}
                        </Link>
                        {template.is_system_template && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            システム
                          </span>
                        )}
                        {template.is_default && !template.is_system_template && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            デフォルト
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {template.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        {template.category && (
                          <span className="inline-flex items-center">
                            <svg
                              className="mr-1 h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                              />
                            </svg>
                            {template.category}
                          </span>
                        )}
                        <span className="inline-flex items-center">
                          <svg
                            className="mr-1 h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                          {template.template_items?.length || 0}項目
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {template.is_system_template ? (
                        <>
                          <button
                            disabled
                            className="inline-flex items-center px-3 py-1.5 border border-gray-200 text-xs font-medium rounded text-gray-400 bg-gray-50 cursor-not-allowed"
                            title="システムテンプレートは編集できません"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDuplicate(template.id, template.name)}
                            className="inline-flex items-center px-3 py-1.5 border border-indigo-300 text-xs font-medium rounded text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            複製
                          </button>
                          <button
                            disabled
                            className="inline-flex items-center px-3 py-1.5 border border-gray-200 text-xs font-medium rounded text-gray-400 bg-gray-50 cursor-not-allowed"
                            title="システムテンプレートは削除できません"
                          >
                            削除
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href={`/templates/${template.id}/edit`}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            編集
                          </Link>
                          <button
                            onClick={() => handleDuplicate(template.id, template.name)}
                            className="inline-flex items-center px-3 py-1.5 border border-indigo-300 text-xs font-medium rounded text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            複製
                          </button>
                          <button
                            onClick={() => handleDelete(template.id, template.name)}
                            className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
