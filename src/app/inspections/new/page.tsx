'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Site {
  id: string
  name: string
  address: string | null
}

interface Template {
  id: string
  name: string
  description: string | null
  is_system_template: boolean
}

export default function NewInspectionPage() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    siteId: '',
    templateId: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    summary: '',
  })

  const fetchData = useCallback(async () => {
    try {
      const [sitesRes, templatesRes] = await Promise.all([
        fetch('/api/sites'),
        fetch('/api/templates'),
      ])

      if (!sitesRes.ok || !templatesRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const sitesData = await sitesRes.json()
      const templatesData = await templatesRes.json()

      setSites(sitesData)
      setTemplates(templatesData)
    } catch (err) {
      console.error('Failed to fetch sites/templates', err)
      setError('データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!formData.siteId || !formData.templateId) {
      setError('現地確認先とテンプレートを選択してください')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to create inspection')
      }

      const inspection = await response.json()
      router.push(`/inspections/${inspection.id}`)
    } catch (err) {
      console.error('Failed to create inspection', err)
      setError('確認記録の作成に失敗しました')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/inspections"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          確認記録一覧に戻る
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          新規確認作成
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          現地確認を開始する施設とテンプレートを選択してください
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow-sm rounded-lg p-6">
        {/* 現地確認先の選択 */}
        <div>
          <label
            htmlFor="siteId"
            className="block text-sm font-medium text-gray-700"
          >
            現地確認先 <span className="text-red-500">*</span>
          </label>
          <select
            id="siteId"
            required
            value={formData.siteId}
            onChange={(e) =>
              setFormData({ ...formData, siteId: e.target.value })
            }
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">選択してください</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} {site.address && `（${site.address}）`}
              </option>
            ))}
          </select>
          {sites.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">
              現地確認先が登録されていません。
              <Link
                href="/sites/new"
                className="text-indigo-600 hover:text-indigo-500"
              >
                こちら
              </Link>
              から登録してください。
            </p>
          )}
        </div>

        {/* テンプレートの選択 */}
        <div>
          <label
            htmlFor="templateId"
            className="block text-sm font-medium text-gray-700"
          >
            チェックシートテンプレート <span className="text-red-500">*</span>
          </label>
          <select
            id="templateId"
            required
            value={formData.templateId}
            onChange={(e) =>
              setFormData({ ...formData, templateId: e.target.value })
            }
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">選択してください</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.is_system_template && ' （システム）'}
              </option>
            ))}
          </select>
          {templates.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">
              テンプレートが登録されていません。
              <Link
                href="/templates/new"
                className="text-indigo-600 hover:text-indigo-500"
              >
                こちら
              </Link>
              から登録してください。
            </p>
          )}
        </div>

        {/* 確認日 */}
        <div>
          <label
            htmlFor="inspectionDate"
            className="block text-sm font-medium text-gray-700"
          >
            確認日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="inspectionDate"
            required
            value={formData.inspectionDate}
            onChange={(e) =>
              setFormData({ ...formData, inspectionDate: e.target.value })
            }
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* サマリー（オプション） */}
        <div>
          <label
            htmlFor="summary"
            className="block text-sm font-medium text-gray-700"
          >
            メモ（オプション）
          </label>
          <textarea
            id="summary"
            rows={3}
            value={formData.summary}
            onChange={(e) =>
              setFormData({ ...formData, summary: e.target.value })
            }
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="確認前のメモや特記事項があれば記入してください"
          />
        </div>

        {/* ボタン */}
        <div className="flex justify-end gap-3">
          <Link
            href="/inspections"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || sites.length === 0 || templates.length === 0}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '作成中...' : '確認を開始'}
          </button>
        </div>
      </form>
    </div>
  )
}
