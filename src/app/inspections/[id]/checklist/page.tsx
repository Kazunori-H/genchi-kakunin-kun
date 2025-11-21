'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import RatingInput from '@/components/RatingInput'
import StatusBadge from '@/components/StatusBadge'
import { createClient } from '@/lib/supabase/client'
import type {
  TemplateItemRecord,
  InspectionItemRecord,
  InspectionStatus,
} from '@/types/inspection'

interface TemplateItem extends TemplateItemRecord {
  display_facility_types: string[] | null
}

type InspectionItem = InspectionItemRecord

interface ApprovalLog {
  id: string
  action: string
  comment: string | null
  created_at: string
  users: {
    id: string
    name: string
    email: string
  }
}

interface Inspection {
  id: string
  inspection_date: string
  status: InspectionStatus
  summary: string | null
  sites: {
    id: string
    name: string
    address: string | null
    facility_types: string[] | null
  }
  templates: {
    id: string
    name: string
    template_items: TemplateItem[]
  }
  inspector: {
    id: string
    name: string
  }
  inspection_items: InspectionItem[]
}

export default function InspectionDetailPage() {
  const params = useParams<{ id: string }>()
  const inspectionId = params?.id
  const router = useRouter()
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [autoSaveMessage, setAutoSaveMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  // 評価値の型を管理（number | 'na' | null）
  const [ratingValues, setRatingValues] = useState<Record<string, number | 'na' | null>>({})
  // メモを管理（template_item_id => note）
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  // 必須項目エラーのある項目IDのリスト
  const [missingRequiredItems, setMissingRequiredItems] = useState<string[]>([])
  // 各チェック項目への参照（スクロール用）
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // セクションヘッダーへの参照（ジャンプ用）
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // カテゴリナビゲーションの表示/非表示
  const [isCategoryNavOpen, setIsCategoryNavOpen] = useState(false)
  // 承認ログ
  const [approvalLogs, setApprovalLogs] = useState<ApprovalLog[]>([])
  // 承認アクション用
  const [approvalComment, setApprovalComment] = useState('')
  // ユーザー情報（ロール確認用）
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  const fetchCurrentUser = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }

      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setCurrentUserRole(data.role)
      }
    } catch (err) {
      console.error('Failed to fetch current user', err)
    }
  }, [])

  const fetchApprovalLogs = useCallback(async () => {
    if (!inspectionId) return
    try {
      const response = await fetch(`/api/inspections/${inspectionId}/logs`)
      if (response.ok) {
        const data = (await response.json()) as ApprovalLog[]
        setApprovalLogs(data)
      }
    } catch (err) {
      console.error('Failed to fetch approval logs', err)
    }
  }, [inspectionId])

  const fetchInspection = useCallback(async () => {
    if (!inspectionId) return
    try {
      const response = await fetch(`/api/inspections/${inspectionId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch inspection')
      }
      const data = (await response.json()) as Inspection
      setInspection(data)

      // 既存の入力値を復元
      const values: Record<string, string> = {}
      const ratings: Record<string, number | 'na' | null> = {}
      const notesData: Record<string, string> = {}
      
      data.inspection_items.forEach((item: InspectionItem) => {
        values[item.template_item_id] = item.value || ''
        
        // メモを復元（metadata.noteから取得）
        if (item.metadata && typeof item.metadata === 'object' && 'note' in item.metadata) {
          notesData[item.template_item_id] = item.metadata.note || ''
        }
        
        // 評価値（rating_1_5_na）の場合、適切な型に変換
        const templateItem = data.templates.template_items.find(
          (ti: TemplateItem) => ti.id === item.template_item_id
        )
        if (templateItem?.item_type === 'rating_1_5_na') {
          const val = item.value
          if (val === 'na' || val === 'N/A') {
            ratings[item.template_item_id] = 'na'
          } else if (val && !isNaN(Number(val))) {
            ratings[item.template_item_id] = Number(val) as 1 | 2 | 3 | 4 | 5
          } else {
            ratings[item.template_item_id] = null
          }
        }
      })
      
      setFormValues(values)
      setRatingValues(ratings)
      setNotes(notesData)
      setHasUnsavedChanges(false)
    } catch (err) {
      console.error('Failed to fetch inspection', err)
      setError('確認記録の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [inspectionId])

  const handleValueChange = (templateItemId: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [templateItemId]: value,
    }))
    setHasUnsavedChanges(true)
  }

  const handleRatingChange = (templateItemId: string, value: number | 'na') => {
    // 評価値を文字列としても保存（互換性のため）
    const stringValue = value === 'na' ? 'na' : String(value)
    handleValueChange(templateItemId, stringValue)
    
    // 評価値も別途管理
    setRatingValues((prev) => ({
      ...prev,
      [templateItemId]: value,
    }))
    setHasUnsavedChanges(true)
  }

  const handleNoteChange = (templateItemId: string, note: string) => {
    setNotes((prev) => ({
      ...prev,
      [templateItemId]: note,
    }))
    setHasUnsavedChanges(true)
  }

  const prepareItemsForSave = useCallback(() => {
    if (!inspection) return []

    return inspection.templates.template_items
      .filter(
        (item) =>
          item.item_type !== 'section_header' && item.item_type !== 'photo'
      )
      .map((item) => {
        const note = notes[item.id]?.trim()
        let value: string | null = null

        if (item.item_type === 'rating_1_5_na') {
          const ratingValue = ratingValues[item.id]
          if (ratingValue === 'na') {
            value = 'na'
          } else if (
            typeof ratingValue === 'number' &&
            ratingValue >= 1 &&
            ratingValue <= 5
          ) {
            value = String(ratingValue)
          } else {
            value = null
          }
        } else {
          const rawValue = formValues[item.id]
          value =
            rawValue !== undefined && rawValue !== null && rawValue.trim() !== ''
              ? rawValue
              : null
        }

        const metadata: Record<string, string> = {}
        if (note) {
          metadata.note = note
        }

        return {
          template_item_id: item.id,
          value,
          metadata,
        }
      })
  }, [inspection, notes, ratingValues, formValues])

  const persistInspection = useCallback(async ({
    silent = false,
    mode = 'manual',
    manageSavingState = true,
  }: {
    silent?: boolean
    mode?: 'manual' | 'auto'
    manageSavingState?: boolean
  } = {}) => {
    if (!inspection) return false

    if (mode === 'auto') {
      setIsAutoSaving(true)
      setAutoSaveMessage('自動保存中...')
    } else if (manageSavingState) {
      setIsSaving(true)
    }

    try {
      const items = prepareItemsForSave()
      const response = await fetch(`/api/inspections/${inspectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: inspection.summary,
          items,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: '保存に失敗しました',
        }))
        throw new Error(errorData.error || '保存に失敗しました')
      }

      setHasUnsavedChanges(false)
      if (mode === 'auto') {
        setAutoSaveMessage('自動保存しました')
        setTimeout(() => setAutoSaveMessage(null), 5000)
      } else if (!silent) {
        alert('下書きを保存しました')
      }
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存に失敗しました'
      if (mode === 'auto') {
        setAutoSaveMessage('自動保存に失敗しました')
      } else {
        setError(message)
      }
      return false
    } finally {
      if (mode === 'auto') {
        setIsAutoSaving(false)
      } else if (manageSavingState) {
        setIsSaving(false)
      }
    }
  }, [inspection, inspectionId, prepareItemsForSave])

  useEffect(() => {
    fetchInspection()
    fetchApprovalLogs()
    fetchCurrentUser()
  }, [fetchInspection, fetchApprovalLogs, fetchCurrentUser])

  useEffect(() => {
    if (!inspection || inspection.status !== 'draft') return
    const interval = setInterval(() => {
      if (hasUnsavedChanges && !isSaving && !isAutoSaving) {
        persistInspection({
          silent: true,
          mode: 'auto',
          manageSavingState: false,
        })
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [inspection, hasUnsavedChanges, isSaving, isAutoSaving, persistInspection])


  const handleWithdraw = async () => {
    if (!inspection) return

    if (!confirm('提出を取り下げますか？下書きに戻ります。')) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/inspections/${inspectionId}/withdraw`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '取り下げに失敗しました')
      }

      const updatedData = await response.json()

      // ローカルの状態を即座に更新
      setInspection({
        ...inspection,
        status: updatedData.status,
        submitted_at: updatedData.submitted_at,
        approver_id: updatedData.approver_id,
      })

      // 承認履歴を再取得
      fetchApprovalLogs()

      alert('提出を取り下げました。下書きに戻りました。')
    } catch (err) {
      const message = err instanceof Error ? err.message : '取り下げに失敗しました'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleApprovalAction = async (action: 'approve' | 'return' | 'reject') => {
    if (!inspection) return

    if ((action === 'return' || action === 'reject') && !approvalComment) {
      setError('差し戻しまたは却下の場合、コメントが必須です')
      return
    }

    const confirmMessages = {
      approve: '確認記録を承認しますか？',
      return: '確認記録を差し戻しますか？',
      reject: '確認記録を却下しますか？',
    }

    if (!confirm(confirmMessages[action])) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/inspections/${inspectionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, comment: approvalComment }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process approval')
      }

      const updatedData = await response.json()

      // ローカルの状態を即座に更新
      setInspection({
        ...inspection,
        status: updatedData.status,
        approver_id: updatedData.approver_id,
        approved_at: updatedData.approved_at,
      })

      // 承認履歴を再取得
      fetchApprovalLogs()

      // コメントをクリア
      setApprovalComment('')

      alert(
        action === 'approve'
          ? '確認記録を承認しました'
          : action === 'return'
          ? '確認記録を差し戻しました'
          : '確認記録を却下しました'
      )

      // 差し戻し以外は一覧に戻る
      if (action !== 'return') {
        router.push('/inspections')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '処理に失敗しました'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    if (!inspection) return
    setError(null)
    setMissingRequiredItems([])
    await persistInspection({ silent: false, mode: 'manual', manageSavingState: true })
  }

  const renderRatingInput = (item: TemplateItem) => {
    const currentValue = ratingValues[item.id] ?? null
    const note = notes[item.id] || ''
    const isDraft = inspection?.status === 'draft'
    const hasError = missingRequiredItems.includes(item.id)

    return (
      <div
        ref={(el) => {
          itemRefs.current[item.id] = el
        }}
        className={`
          transition-all duration-300
          ${hasError 
            ? 'border-2 border-red-500 rounded-lg p-3 bg-red-50' 
            : ''
          }
        `}
        tabIndex={hasError ? -1 : undefined}
      >
        <RatingInput
          label={item.label}
          description={item.description || undefined}
          value={currentValue}
          onChange={(value) => {
            handleRatingChange(item.id, value)
            // 入力されたらエラー状態を解除
            if (missingRequiredItems.includes(item.id)) {
              setMissingRequiredItems((prev) => prev.filter((id) => id !== item.id))
            }
          }}
          note={note}
          onNoteChange={(note) => handleNoteChange(item.id, note)}
          required={item.required}
          disabled={!isDraft}
        />
        {hasError && (
          <p className="mt-2 text-sm text-red-600 font-medium">
            ※ この項目は必須です
          </p>
        )}
      </div>
    )
  }

  const renderSectionHeader = (item: TemplateItem) => {
    return (
      <div
        ref={(el) => {
          sectionRefs.current[item.id] = el
        }}
        id={`section-${item.id}`}
        className="pt-6 pb-2 scroll-mt-24 lg:scroll-mt-4"
      >
        <h3 className="text-lg font-semibold text-gray-900">{item.label}</h3>
      </div>
    )
  }

  const renderTextInput = (item: TemplateItem) => {
    const currentValue = formValues[item.id] || ''
    const isDraft = inspection?.status === 'draft'
    const hasError = missingRequiredItems.includes(item.id)

    return (
      <div
        ref={(el) => {
          itemRefs.current[item.id] = el
        }}
        className={`
          transition-all duration-300
          ${hasError
            ? 'border-2 border-red-500 rounded-lg p-3 bg-red-50'
            : ''
          }
        `}
        tabIndex={hasError ? -1 : undefined}
      >
        <label className="block text-sm font-medium text-gray-900">
          {item.label}
          {item.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {item.description && (
          <p className="mt-1 text-xs text-gray-500">{item.description}</p>
        )}
        <input
          type="text"
          value={currentValue}
          onChange={(e) => {
            handleValueChange(item.id, e.target.value)
            if (missingRequiredItems.includes(item.id)) {
              setMissingRequiredItems((prev) => prev.filter((id) => id !== item.id))
            }
          }}
          disabled={!isDraft}
          className="mt-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
        />
        {hasError && (
          <p className="mt-2 text-sm text-red-600 font-medium">
            ※ この項目は必須です
          </p>
        )}
      </div>
    )
  }

  const renderTextarea = (item: TemplateItem) => {
    const currentValue = formValues[item.id] || ''
    const isDraft = inspection?.status === 'draft'
    const hasError = missingRequiredItems.includes(item.id)

    return (
      <div
        ref={(el) => {
          itemRefs.current[item.id] = el
        }}
        className={`
          transition-all duration-300
          ${hasError
            ? 'border-2 border-red-500 rounded-lg p-3 bg-red-50'
            : ''
          }
        `}
        tabIndex={hasError ? -1 : undefined}
      >
        <label className="block text-sm font-medium text-gray-900">
          {item.label}
          {item.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {item.description && (
          <p className="mt-1 text-xs text-gray-500">{item.description}</p>
        )}
        <textarea
          rows={3}
          value={currentValue}
          onChange={(e) => {
            handleValueChange(item.id, e.target.value)
            if (missingRequiredItems.includes(item.id)) {
              setMissingRequiredItems((prev) => prev.filter((id) => id !== item.id))
            }
          }}
          disabled={!isDraft}
          className="mt-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
        />
        {hasError && (
          <p className="mt-2 text-sm text-red-600 font-medium">
            ※ この項目は必須です
          </p>
        )}
      </div>
    )
  }

  const renderSelect = (item: TemplateItem) => {
    const currentValue = formValues[item.id] || ''
    const isDraft = inspection?.status === 'draft'
    const hasError = missingRequiredItems.includes(item.id)
    const options = item.options || []

    return (
      <div
        ref={(el) => {
          itemRefs.current[item.id] = el
        }}
        className={`
          transition-all duration-300
          ${hasError
            ? 'border-2 border-red-500 rounded-lg p-3 bg-red-50'
            : ''
          }
        `}
        tabIndex={hasError ? -1 : undefined}
      >
        <label className="block text-sm font-medium text-gray-900">
          {item.label}
          {item.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {item.description && (
          <p className="mt-1 text-xs text-gray-500">{item.description}</p>
        )}
        <select
          value={currentValue}
          onChange={(e) => {
            handleValueChange(item.id, e.target.value)
            if (missingRequiredItems.includes(item.id)) {
              setMissingRequiredItems((prev) => prev.filter((id) => id !== item.id))
            }
          }}
          disabled={!isDraft}
          className="mt-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
        >
          <option value="">選択してください</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {hasError && (
          <p className="mt-2 text-sm text-red-600 font-medium">
            ※ この項目は必須です
          </p>
        )}
      </div>
    )
  }

  const renderNumberInput = (item: TemplateItem) => {
    const currentValue = formValues[item.id] || ''
    const isDraft = inspection?.status === 'draft'
    const hasError = missingRequiredItems.includes(item.id)

    return (
      <div
        ref={(el) => {
          itemRefs.current[item.id] = el
        }}
        className={`
          transition-all duration-300
          ${hasError
            ? 'border-2 border-red-500 rounded-lg p-3 bg-red-50'
            : ''
          }
        `}
        tabIndex={hasError ? -1 : undefined}
      >
        <label className="block text-sm font-medium text-gray-900">
          {item.label}
          {item.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {item.description && (
          <p className="mt-1 text-xs text-gray-500">{item.description}</p>
        )}
        <input
          type="number"
          value={currentValue}
          onChange={(e) => {
            handleValueChange(item.id, e.target.value)
            if (missingRequiredItems.includes(item.id)) {
              setMissingRequiredItems((prev) => prev.filter((id) => id !== item.id))
            }
          }}
          disabled={!isDraft}
          className="mt-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
        />
        {hasError && (
          <p className="mt-2 text-sm text-red-600 font-medium">
            ※ この項目は必須です
          </p>
        )}
      </div>
    )
  }

  const renderDateInput = (item: TemplateItem) => {
    const currentValue = formValues[item.id] || ''
    const isDraft = inspection?.status === 'draft'
    const hasError = missingRequiredItems.includes(item.id)

    return (
      <div
        ref={(el) => {
          itemRefs.current[item.id] = el
        }}
        className={`
          transition-all duration-300
          ${hasError
            ? 'border-2 border-red-500 rounded-lg p-3 bg-red-50'
            : ''
          }
        `}
        tabIndex={hasError ? -1 : undefined}
      >
        <label className="block text-sm font-medium text-gray-900">
          {item.label}
          {item.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {item.description && (
          <p className="mt-1 text-xs text-gray-500">{item.description}</p>
        )}
        <input
          type="date"
          value={currentValue}
          onChange={(e) => {
            handleValueChange(item.id, e.target.value)
            if (missingRequiredItems.includes(item.id)) {
              setMissingRequiredItems((prev) => prev.filter((id) => id !== item.id))
            }
          }}
          disabled={!isDraft}
          className="mt-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
        />
        {hasError && (
          <p className="mt-2 text-sm text-red-600 font-medium">
            ※ この項目は必須です
          </p>
        )}
      </div>
    )
  }

  const renderPhotoPlaceholder = (item: TemplateItem) => {
    const isDraft = inspection?.status === 'draft'

    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
        <p className="text-sm font-medium text-gray-900">{item.label}</p>
        {item.description && (
          <p className="text-xs text-gray-500 mt-1">{item.description}</p>
        )}
        <p className="mt-2 text-sm text-gray-600">
          写真は確認記録サマリーの「写真添付」セクションから追加してください。
        </p>
        {isDraft && (
          <Link
            href={`/inspections/${params.id}`}
            className="mt-3 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
          >
            サマリーへ移動
            <svg
              className="w-4 h-4 ml-1"
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
          </Link>
        )}
      </div>
    )
  }

  // カテゴリ（セクション）一覧を取得
  const getSections = () => {
    if (!inspection) return []
    return inspection.templates.template_items
      .filter((item) => item.item_type === 'section_header')
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  // カテゴリにジャンプ
  const scrollToSection = (sectionId: string) => {
    const sectionRef = sectionRefs.current[sectionId]
    if (sectionRef) {
      // 少し遅延を入れて、DOM更新を待つ
      setTimeout(() => {
        const rect = sectionRef.getBoundingClientRect()
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const targetY = rect.top + scrollTop - (window.innerWidth < 1024 ? 96 : 16)
        
        window.scrollTo({
          top: targetY,
          behavior: 'smooth',
        })
      }, 50)
      
      setIsCategoryNavOpen(false) // モバイルの場合、ナビゲーションを閉じる
    }
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-6">
        <Link
          href={`/inspections/${params.id}`}
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
          サマリーに戻る
        </Link>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {inspection.sites.name}
            </h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              <span>
                確認日: {new Date(inspection.inspection_date).toLocaleDateString('ja-JP')}
              </span>
              <span>テンプレート: {inspection.templates.name}</span>
              <span>確認者: {inspection.inspector.name}</span>
            </div>
          </div>
          <div>
            <StatusBadge
              status={inspection.status as 'draft' | 'pending_approval' | 'approved' | 'rejected'}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
              {missingRequiredItems.length > 0 && (
                <p className="mt-2 text-sm text-red-700">
                  必須項目に移動します...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツエリア */}
      <div className="lg:flex lg:gap-6">
        {/* チェックシートエリア */}
        <div className="flex-1 min-w-0">
        {/* カテゴリナビゲーション - モバイル（固定） */}
        {getSections().length > 0 && (
          <div className="lg:hidden sticky top-0 z-50 mb-4 bg-white py-2 -mx-6 px-6 border-b border-gray-200 shadow-sm -mt-6 -mb-0">
            <button
              type="button"
              onClick={() => setIsCategoryNavOpen(!isCategoryNavOpen)}
              className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span>カテゴリにジャンプ</span>
              <svg
                className={`w-5 h-5 transition-transform ${
                  isCategoryNavOpen ? 'transform rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {isCategoryNavOpen && (
              <div className="mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
                {getSections().map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* チェックシート */}
        <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="space-y-6">
          {inspection.templates.template_items
            .sort((a, b) => a.sort_order - b.sort_order)
            .filter((item) => {
              // セクションヘッダーは常に表示
              if (item.item_type === 'section_header') return true

              // 表示条件が未設定または空の場合は常に表示（共通項目）
              if (!item.display_facility_types || item.display_facility_types.length === 0) {
                return true
              }

              // 施設の種別が未設定の場合は共通項目のみ表示
              if (!inspection.sites.facility_types || inspection.sites.facility_types.length === 0) {
                return item.display_facility_types.length === 0
              }

              // OR条件：施設の種別のいずれかが項目の条件に一致すれば表示
              return item.display_facility_types.some(type =>
                inspection.sites.facility_types!.includes(type)
              )
            })
            .map((item) => (
              <div key={item.id}>
                {item.item_type === 'section_header'
                  ? renderSectionHeader(item)
                  : item.item_type === 'rating_1_5_na'
                  ? renderRatingInput(item)
                  : item.item_type === 'photo'
                  ? renderPhotoPlaceholder(item)
                  : item.item_type === 'text'
                  ? renderTextInput(item)
                  : item.item_type === 'textarea'
                  ? renderTextarea(item)
                  : item.item_type === 'select'
                  ? renderSelect(item)
                  : item.item_type === 'number'
                  ? renderNumberInput(item)
                  : item.item_type === 'date'
                  ? renderDateInput(item)
                  : null}
              </div>
            ))}
        </div>

        {/* アクションボタン */}
        {isDraft && (
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        )}
        {isDraft && (
          <p className="mt-3 text-xs text-gray-500 text-right">
            {isAutoSaving
              ? '自動保存中...'
              : autoSaveMessage || (hasUnsavedChanges ? '未保存の変更があります' : 'すべて保存済み')}
          </p>
        )}

        {/* 提出者用：取り下げボタン */}
        {inspection.status === 'pending_approval' && inspection.inspector.id === currentUserId && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-yellow-400 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">
                    承認待ち
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    この確認記録は承認待ちです。承認されるまで編集できません。
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={handleWithdraw}
                      disabled={isSaving}
                      className="px-4 py-2 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-800 bg-white hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                    >
                      {isSaving ? '処理中...' : '提出を取り下げる'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 承認アクション */}
        {inspection.status === 'pending_approval' && currentUserRole && currentUserRole !== 'inspector' && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">承認アクション</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="approvalComment" className="block text-sm font-medium text-gray-700">
                  コメント {(approvalComment || inspection.status === 'pending_approval') && (
                    <span className="text-xs text-gray-500">（差し戻し・却下時は必須）</span>
                  )}
                </label>
                <textarea
                  id="approvalComment"
                  rows={3}
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="承認・差し戻し・却下の理由を入力してください"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleApprovalAction('approve')}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isSaving ? '処理中...' : '承認'}
                </button>
                <button
                  onClick={() => handleApprovalAction('return')}
                  disabled={isSaving || !approvalComment}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!approvalComment ? 'コメントを入力してください' : ''}
                >
                  {isSaving ? '処理中...' : '差し戻し'}
                </button>
                <button
                  onClick={() => handleApprovalAction('reject')}
                  disabled={isSaving || !approvalComment}
                  className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!approvalComment ? 'コメントを入力してください' : ''}
                >
                  {isSaving ? '処理中...' : '却下'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 承認履歴 */}
        {approvalLogs.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">承認履歴</h3>
            <div className="space-y-3">
              {approvalLogs.map((log) => (
                <div key={log.id} className="text-sm bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{log.users.name}</span>
                    <span className="text-gray-500">
                      {log.action === 'submit' && '提出'}
                      {log.action === 'approve' && '承認'}
                      {log.action === 'return' && '差し戻し'}
                      {log.action === 'reject' && '却下'}
                      {log.action === 'withdraw' && '取り下げ'}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {new Date(log.created_at).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  {log.comment && (
                    <p className="mt-2 text-gray-700 ml-2">{log.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
        </div>

        {/* カテゴリナビゲーション - デスクトップ（サイドバー） */}
        {getSections().length > 0 && (
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-4">
              <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  カテゴリにジャンプ
                </div>
                <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {getSections().map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors"
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
