'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface TemplateItem {
  id: string
  item_type: string
  label: string
  description: string | null
  options: Record<string, unknown> | null
  required: boolean
  sort_order: number
  display_facility_types: string[] | null
}

interface Template {
  id: string
  name: string
  description: string | null
  category: string | null
  is_default: boolean
  sort_order: number
  created_at: string
  template_items: TemplateItem[]
}

export default function TemplateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [template, setTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplate = useCallback(async () => {
    try {
      const response = await fetch(`/api/templates/${params.id}`)
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to fetch template')
      }
      const data = await response.json()
      setTemplate(data)
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err instanceof Error ? err.message : 'テンプレートの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  const handleDuplicate = async () => {
    if (!template) return

    if (
      !confirm(
        `「${template.name}」を複製しますか？`
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/templates/${params.id}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate template')
      }

      const newTemplate = await response.json()
      router.push(`/templates/${newTemplate.id}`)
      router.refresh()
    } catch (err) {
      console.error('Failed to duplicate template', err)
      alert('テンプレートの複製に失敗しました')
    }
  }

  const handleDelete = async () => {
    if (!template) return

    if (
      !confirm(
        `「${template.name}」を削除しますか？この操作は取り消せません。`
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/templates/${params.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }

      router.push('/templates')
    } catch (err) {
      console.error('Failed to delete template', err)
      alert('テンプレートの削除に失敗しました')
    }
  }

  const getItemTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      text: 'テキスト入力',
      textarea: 'テキストエリア',
      select: '選択式（OK/NG/該当なし）',
      number: '数値入力',
      date: '日付入力',
      photo: '写真添付',
    }
    return types[type] || type
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">{error || 'テンプレートが見つかりません'}</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
            {template.is_default && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                デフォルト
              </span>
            )}
          </div>
          {template.description && (
            <p className="mt-2 text-gray-600">{template.description}</p>
          )}
          {template.category && (
            <p className="mt-1 text-sm text-gray-500">
              カテゴリ: {template.category}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            href={`/templates/${template.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            編集
          </Link>
          <button
            onClick={handleDuplicate}
            className="inline-flex items-center px-4 py-2 border border-indigo-300 rounded-md shadow-sm text-sm font-medium text-indigo-700 bg-white hover:bg-indigo-50"
          >
            複製
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
          >
            削除
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            チェック項目（{template.template_items?.length || 0}項目）
          </h2>
        </div>

        {template.template_items && template.template_items.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {template.template_items
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item, index) => (
                <li key={item.id} className="px-6 py-4">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-800 text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-gray-900">
                              {item.label}
                            </h3>
                            {item.required && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                必須
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="mt-1 text-sm text-gray-500">
                              {item.description}
                            </p>
                          )}
                          {item.display_facility_types && item.display_facility_types.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs text-gray-500 mr-2">表示条件:</span>
                              <div className="inline-flex flex-wrap gap-1">
                                {item.display_facility_types.map((type) => {
                                  const typeLabels: Record<string, string> = {
                                    transport: '運搬',
                                    transfer_storage: '積替保管',
                                    intermediate_treatment: '中間処理',
                                    final_disposal: '最終処分',
                                  }
                                  return (
                                    <span
                                      key={type}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                      {typeLabels[type] || type}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {getItemTypeLabel(item.item_type)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            チェック項目がありません
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Link
          href="/templates"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          一覧に戻る
        </Link>
      </div>
    </div>
  )
}
