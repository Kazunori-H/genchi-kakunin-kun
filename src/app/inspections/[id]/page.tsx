'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { generateInspectionPDF } from '@/lib/pdf/inspection-pdf'

interface TemplateItem {
  id: string
  item_type: string
  label: string
  description: string | null
  required: boolean
  sort_order: number
}

interface InspectionItem {
  id: string
  template_item_id: string
  value: string | null
  metadata: Record<string, unknown> | null
}

interface Photo {
  id: string
  file_name: string
  file_path: string
  public_url?: string
  uploaded_at: string
  inspection_item_id: string | null
  edited_data?: Record<string, unknown>
}

interface Inspection {
  id: string
  inspection_date: string
  status: string
  summary: string | null
  sites: {
    id: string
    name: string
    address: string | null
  }
  templates: {
    id: string
    name: string
    template_items: TemplateItem[]
  }
  inspector?: {
    id: string
    name: string | null
    email?: string | null
  }
  inspection_items: InspectionItem[]
  photos?: Photo[]
}

export default function InspectionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const inspectionId = params.id as string
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [summaryText, setSummaryText] = useState('')
  const [summaryPhotos, setSummaryPhotos] = useState<Photo[]>([])
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchInspection = useCallback(async () => {
    try {
      const response = await fetch(`/api/inspections/${inspectionId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch inspection')
      }
      const data = await response.json()
      setInspection(data)

      // 既存の入力値を復元
      const values: Record<string, string> = {}
      data.inspection_items.forEach((item: InspectionItem) => {
        values[item.template_item_id] = item.value || ''
      })
      setFormValues(values)

      // サマリーを復元
      setSummaryText(data.summary || '')

      // サマリー写真を取得
      if (data.photos) {
        const summaryPhotoList = data.photos.filter((p: Photo) => !p.inspection_item_id)
        setSummaryPhotos(summaryPhotoList)
      }
    } catch (err) {
      console.error(err)
      setError('確認記録の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [inspectionId])

  useEffect(() => {
    fetchInspection()
  }, [fetchInspection])

  const handleValueChange = (templateItemId: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [templateItemId]: value,
    }))
  }

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSummaryText(e.target.value)
  }

  const handleSave = async (submitStatus: 'draft' | 'pending_approval' = 'draft') => {
    if (!inspection) return

    setIsSaving(true)
    setError(null)

    // 必須項目のチェック（承認申請時のみ）
    if (submitStatus === 'pending_approval') {
      const requiredItems = inspection.templates.template_items.filter(
        (item) => item.required && item.item_type !== 'section_header'
      )
      const missingItems = requiredItems.filter(
        (item) => !formValues[item.id] || formValues[item.id] === ''
      )

      if (missingItems.length > 0) {
        setError(`必須項目が入力されていません（${missingItems.length}件）`)
        setIsSaving(false)
        return
      }
    }

    try {
      const items = Object.entries(formValues)
        .filter(([, value]) => value !== '')
        .map(([templateItemId, value]) => ({
          template_item_id: templateItemId,
          value,
          metadata: {},
        }))

      const response = await fetch(`/api/inspections/${inspectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: submitStatus,
          summary: summaryText,
          items,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save inspection')
      }

      if (submitStatus === 'pending_approval') {
        alert('承認申請を送信しました')
        router.push('/inspections')
      } else {
        alert('下書きを保存しました')
        await fetchInspection()
      }
    } catch (err) {
      console.error(err)
      setError('保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (!inspection || inspection.status !== 'draft') return

    setIsUploadingPhoto(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('inspection_id', inspectionId)

        const response = await fetch(`/api/inspections/${inspectionId}/photos`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        setUploadProgress(Math.round(((i + 1) / files.length) * 100))
      }

      // 写真リストを再取得
      await fetchInspection()

      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error(err)
      alert('写真のアップロードに失敗しました')
    } finally {
      setIsUploadingPhoto(false)
      setUploadProgress(0)
    }
  }

  const handlePhotoDelete = async (photoId: string) => {
    if (!confirm('この写真を削除しますか？')) return

    try {
      const response = await fetch(
        `/api/inspections/${inspectionId}/photos/${photoId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete photo')
      }

      setSummaryPhotos((prev) => prev.filter((p) => p.id !== photoId))
    } catch (err) {
      console.error(err)
      alert('写真の削除に失敗しました')
    }
  }

  const handlePhotoMemoChange = async (photoId: string, memo: string) => {
    if (!inspection || inspection.status !== 'draft') return

    try {
      const response = await fetch(
        `/api/inspections/${inspectionId}/photos/${photoId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ edited_data: { memo } }),
        }
      )

      if (!response.ok) {
        throw new Error('メモの保存に失敗しました')
      }

      // ローカルステートを更新
      setSummaryPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId
            ? { ...photo, edited_data: { memo } }
            : photo
        )
      )
    } catch (err) {
      console.error('Failed to update photo memo', err)
      alert('メモの保存に失敗しました')
    }
  }

  const handleGeneratePDF = async () => {
    if (!inspection) return

    setIsPdfGenerating(true)
    setPdfProgress({ current: 0, total: summaryPhotos.length })

    try {
      const pdf = await generateInspectionPDF(
        inspection,
        true,
        (current, total) => {
          setPdfProgress({ current, total })
        }
      )

      const filename = `inspection_${inspection.sites.name}_${
        new Date().toISOString().split('T')[0]
      }.pdf`
      pdf.save(filename)
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert('PDF生成に失敗しました')
    } finally {
      setIsPdfGenerating(false)
      setPdfProgress({ current: 0, total: 0 })
    }
  }

  const renderRatingInput = (item: TemplateItem) => {
    const value = formValues[item.id] || ''
    const options = ['1', '2', '3', '4', '5']
    if (!item.required) {
      options.push('na')
    }

    return (
      <div className="space-y-2">
        <div className="flex items-start">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700">
              {item.label}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {item.description && (
              <p className="mt-1 text-xs text-gray-500">{item.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleValueChange(item.id, option)}
              disabled={inspection?.status !== 'draft'}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                value === option
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              } ${
                inspection?.status !== 'draft'
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              {option === 'na' ? 'N/A' : option}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderSectionHeader = (item: TemplateItem) => {
    return (
      <div className="pt-6 pb-2">
        <h3 className="text-lg font-semibold text-gray-900">{item.label}</h3>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    )
  }

  if (!inspection) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">確認記録が見つかりません</div>
      </div>
    )
  }

  const isDraft = inspection.status === 'draft'
  const inspectorName = inspection.inspector?.name ?? '確認者未設定'

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <Link
          href="/inspections"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {inspection.sites.name}
            </h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              <span>
                確認日: {new Date(inspection.inspection_date).toLocaleDateString('ja-JP')}
              </span>
              <span>テンプレート: {inspection.templates.name}</span>
              <span>確認者: {inspectorName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGeneratePDF}
              disabled={isPdfGenerating}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isPdfGenerating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  生成中... ({pdfProgress.current}/{pdfProgress.total})
                </>
              ) : (
                <>
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
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                    />
                  </svg>
                  PDFダウンロード
                </>
              )}
            </button>
            {inspection.status === 'draft' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                下書き
              </span>
            )}
            {inspection.status === 'pending_approval' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                承認待ち
              </span>
            )}
            {inspection.status === 'approved' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                承認済み
              </span>
            )}
          </div>
        </div>
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

      {/* チェックシート */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">チェック項目</h2>
        <div className="space-y-6">
          {inspection.templates.template_items
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((item) => (
              <div key={item.id}>
                {item.item_type === 'section_header'
                  ? renderSectionHeader(item)
                  : item.item_type === 'rating_1_5_na'
                  ? renderRatingInput(item)
                  : null}
              </div>
            ))}
        </div>
      </div>

      {/* 所見・総評 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">所見・総評</h2>
        <textarea
          value={summaryText}
          onChange={handleSummaryChange}
          disabled={!isDraft}
          placeholder="確認結果の総評や所見を記入してください..."
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
          rows={6}
        />
      </div>

      {/* 写真 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">添付写真</h2>
          {isDraft && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isUploadingPhoto ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    アップロード中... {uploadProgress}%
                  </>
                ) : (
                  <>
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
                    写真を追加
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {summaryPhotos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            写真が添付されていません
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {summaryPhotos.map((photo) => {
              const photoMemo = (photo.edited_data as { memo?: string })?.memo || ''
              return (
                <div
                  key={photo.id}
                  className="relative rounded-lg overflow-hidden bg-gray-50 border border-gray-200"
                >
                  <div className="aspect-square relative">
                    <img
                      src={photo.public_url || `/api/inspections/${inspectionId}/photos/${photo.id}/download`}
                      alt={photo.file_name}
                      className="w-full h-full object-cover"
                    />
                    {isDraft && (
                      <button
                        onClick={() => handlePhotoDelete(photo.id)}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <svg
                          className="w-4 h-4"
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
                      </button>
                    )}
                  </div>
                  <div className="p-3 text-xs text-gray-600 space-y-2">
                    <div className="truncate" title={photo.file_name}>
                      {photo.file_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(photo.uploaded_at).toLocaleString('ja-JP')}
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        写真メモ
                      </label>
                      <textarea
                        value={photoMemo}
                        onChange={(e) => handlePhotoMemoChange(photo.id, e.target.value)}
                        disabled={!isDraft}
                        placeholder="写真の説明やメモを入力..."
                        className="w-full text-xs rounded border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* アクションボタン */}
      {isDraft && (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={() => handleSave('draft')}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '下書き保存'}
            </button>
            <button
              onClick={() => {
                if (confirm('承認申請を送信しますか？送信後は編集できません。')) {
                  handleSave('pending_approval')
                }
              }}
              disabled={isSaving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSaving ? '送信中...' : '承認申請'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
