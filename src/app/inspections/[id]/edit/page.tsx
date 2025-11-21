'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Attendee {
  name: string
  organization: string
  position: string
}

interface OverviewMetadata {
  time?: {
    start_time: string
    end_time: string
  }
  attendees?: Attendee[]
}

interface Inspection {
  id: string
  inspection_date: string
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
  summary: string | null
  overview_metadata?: OverviewMetadata
  sites: {
    id: string
    name: string
  }
}

export default function EditInspectionOverviewPage() {
  const params = useParams<{ id: string }>()
  const inspectionId = params?.id
  const router = useRouter()
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [inspectionDate, setInspectionDate] = useState('')
  const [summary, setSummary] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInspection = useCallback(async () => {
    if (!inspectionId) return
    try {
      const response = await fetch(`/api/inspections/${inspectionId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch inspection')
      }
      const data = await response.json()
      setInspection(data)
      setInspectionDate(data.inspection_date)
      setSummary(data.summary || '')

      // 概要メタデータの読み込み
      if (data.overview_metadata) {
        setStartTime(data.overview_metadata.time?.start_time || '')
        setEndTime(data.overview_metadata.time?.end_time || '')
        setAttendees(data.overview_metadata.attendees || [])
      }
    } catch (err) {
      console.error('Failed to fetch inspection', err)
      setError('確認記録の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [inspectionId])

  useEffect(() => {
    fetchInspection()
  }, [fetchInspection])

  const addAttendee = () => {
    setAttendees([...attendees, { name: '', organization: '', position: '' }])
  }

  const removeAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index))
  }

  const updateAttendee = (index: number, field: keyof Attendee, value: string) => {
    const newAttendees = [...attendees]
    newAttendees[index][field] = value
    setAttendees(newAttendees)
  }

  const handleSave = async () => {
    if (!inspection) return

    setIsSaving(true)
    setError(null)

    try {
      // 概要メタデータの構築
      const overviewMetadata: OverviewMetadata = {}

      if (startTime || endTime) {
        overviewMetadata.time = {
          start_time: startTime,
          end_time: endTime,
        }
      }

      // 空でない立会者のみ保存
      const validAttendees = attendees.filter(
        a => a.name.trim() !== '' || a.organization.trim() !== '' || a.position.trim() !== ''
      )
      if (validAttendees.length > 0) {
        overviewMetadata.attendees = validAttendees
      }

      const response = await fetch(`/api/inspections/${inspectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inspection_date: inspectionDate,
          summary: summary,
          overview_metadata: overviewMetadata,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '保存に失敗しました')
      }

      router.push(`/inspections/${inspectionId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存に失敗しました'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    )
  }

  if (error && !inspection) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">{error}</div>
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

  // 下書き以外は編集不可
  if (inspection.status !== 'draft') {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg
              className="h-6 w-6 text-yellow-400 mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="text-lg font-medium text-yellow-800">
                編集できません
              </h3>
              <p className="mt-2 text-sm text-yellow-700">
                下書き以外の確認記録は編集できません。
              </p>
              <div className="mt-4">
                <Link
                  href={`/inspections/${params.id}`}
                  className="inline-flex items-center px-4 py-2 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-800 bg-white hover:bg-yellow-50"
                >
                  サマリーに戻る
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* ヘッダー */}
      <div className="mb-6">
        <Link
          href={`/inspections/${params.id}`}
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
          サマリーに戻る
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">概要の編集</h1>
          <p className="mt-2 text-sm text-gray-600">
            {inspection.sites.name}
          </p>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* 編集フォーム */}
      <div className="space-y-6">
        {/* 基本情報セクション */}
        <div className="bg-white shadow-sm rounded-lg p-6">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            基本情報
          </h2>
          <div>
            <label
              htmlFor="inspection_date"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              確認実施日
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="date"
              id="inspection_date"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              現地確認を実施した日付を選択してください
            </p>
          </div>
        </div>

        {/* 時刻情報セクション */}
        <div className="bg-white shadow-sm rounded-lg p-6">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            時刻情報
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="start_time"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                開始時刻
              </label>
              <input
                type="time"
                id="start_time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="end_time"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                終了時刻
              </label>
              <input
                type="time"
                id="end_time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* 立会者情報セクション */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              立会者情報
            </h2>
            <button
              type="button"
              onClick={addAttendee}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              立会者を追加
            </button>
          </div>

          {attendees.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              立会者が登録されていません。「立会者を追加」ボタンから追加してください。
            </div>
          ) : (
            <div className="space-y-4">
              {attendees.map((attendee, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 relative"
                >
                  <button
                    type="button"
                    onClick={() => removeAttendee(index)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
                    title="削除"
                  >
                    <svg
                      className="w-5 h-5"
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        氏名
                      </label>
                      <input
                        type="text"
                        value={attendee.name}
                        onChange={(e) =>
                          updateAttendee(index, 'name', e.target.value)
                        }
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="山田太郎"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        所属
                      </label>
                      <input
                        type="text"
                        value={attendee.organization}
                        onChange={(e) =>
                          updateAttendee(index, 'organization', e.target.value)
                        }
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="○○株式会社"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        役職
                      </label>
                      <input
                        type="text"
                        value={attendee.position}
                        onChange={(e) =>
                          updateAttendee(index, 'position', e.target.value)
                        }
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="施設長"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 所見・備考セクション */}
        <div className="bg-white shadow-sm rounded-lg p-6">
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
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            所見・備考
          </h2>
          <div>
            <textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={8}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="現地確認の所見や備考を記入してください"
            />
            <p className="mt-1 text-xs text-gray-500">
              確認結果の総括や特記事項などを記入してください
            </p>
          </div>
        </div>

        {/* ボタン */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link
            href={`/inspections/${params.id}`}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            キャンセル
          </Link>
          <button
            onClick={handleSave}
            disabled={isSaving || !inspectionDate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                保存中...
              </>
            ) : (
              '保存'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
