'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface TemplateItemInput {
  id?: string
  itemType: string
  label: string
  description: string
  options: Record<string, unknown>
  required: boolean
  sortOrder: number
  displayFacilityTypes: string[]
}

interface Template {
  id: string
  name: string
  description: string | null
  category: string | null
  is_default: boolean
  sort_order: number
  template_items: Array<{
    id: string
    item_type: string
    label: string
    description: string | null
    options: Record<string, unknown> | null
    required: boolean
    sort_order: number
    display_facility_types: string[] | null
  }>
}

export default function EditTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [items, setItems] = useState<TemplateItemInput[]>([])

  const itemTypes = [
    { value: 'text', label: 'テキスト入力' },
    { value: 'textarea', label: 'テキストエリア' },
    { value: 'select', label: '選択式（OK/NG/該当なし）' },
    { value: 'number', label: '数値入力' },
    { value: 'date', label: '日付入力' },
    { value: 'photo', label: '写真添付' },
  ]

  const fetchTemplate = useCallback(async () => {
    try {
      const response = await fetch(`/api/templates/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch template')
      }
      const data: Template = await response.json()

      setName(data.name)
      setDescription(data.description || '')
      setCategory(data.category || '')
      setIsDefault(data.is_default)
      setItems(
        data.template_items
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => ({
            id: item.id,
            itemType: item.item_type,
            label: item.label,
            description: item.description || '',
            options: item.options || {},
            required: item.required,
            sortOrder: item.sort_order,
            displayFacilityTypes: item.display_facility_types || [],
          }))
      )
    } catch (err) {
      console.error('Failed to fetch template', err)
      setError('テンプレートの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  const addItem = () => {
    setItems([
      ...items,
      {
        itemType: 'text',
        label: '',
        description: '',
        options: {},
        required: false,
        sortOrder: items.length,
        displayFacilityTypes: [],
      },
    ])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: unknown) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const toggleFacilityType = (itemIndex: number, facilityType: string) => {
    const newItems = [...items]
    const currentTypes = newItems[itemIndex].displayFacilityTypes
    if (currentTypes.includes(facilityType)) {
      newItems[itemIndex].displayFacilityTypes = currentTypes.filter(t => t !== facilityType)
    } else {
      newItems[itemIndex].displayFacilityTypes = [...currentTypes, facilityType]
    }
    setItems(newItems)
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    ) {
      return
    }

    const newItems = [...items]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newItems[index], newItems[targetIndex]] = [
      newItems[targetIndex],
      newItems[index],
    ]

    // sortOrderを更新
    newItems.forEach((item, i) => {
      item.sortOrder = i
    })

    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/templates/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          category,
          isDefault,
          items,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update template')
      }

      router.push(`/templates/${params.id}`)
    } catch (err) {
      console.error('Failed to update template', err)
      setError('テンプレートの更新に失敗しました')
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

  if (error && !name) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">テンプレート編集</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本情報 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                テンプレート名 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                説明
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700"
              >
                カテゴリ
              </label>
              <input
                type="text"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="例: 保管状況、設備状態、書類確認"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label
                htmlFor="isDefault"
                className="ml-2 block text-sm text-gray-900"
              >
                デフォルトテンプレートとして設定
              </label>
            </div>
          </div>
        </div>

        {/* チェック項目 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">チェック項目</h2>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
            >
              項目を追加
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              まだチェック項目がありません。「項目を追加」ボタンをクリックして追加してください。
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 text-indigo-800 text-xs font-medium">
                        {index + 1}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="上へ移動"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === items.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="下へ移動"
                        >
                          <svg
                            className="h-4 w-4"
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
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      削除
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        項目タイプ
                      </label>
                      <select
                        value={item.itemType}
                        onChange={(e) =>
                          updateItem(index, 'itemType', e.target.value)
                        }
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        {itemTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={item.required}
                          onChange={(e) =>
                            updateItem(index, 'required', e.target.checked)
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">
                          必須項目
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ラベル <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={item.label}
                      onChange={(e) =>
                        updateItem(index, 'label', e.target.value)
                      }
                      placeholder="例: 廃棄物の保管状況"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      説明
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(index, 'description', e.target.value)
                      }
                      placeholder="この項目の説明や確認ポイント"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      表示する施設種別
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'transport', label: '運搬' },
                        { value: 'transfer_storage', label: '積替保管' },
                        { value: 'intermediate_treatment', label: '中間処理' },
                        { value: 'final_disposal', label: '最終処分' },
                      ].map((facilityType) => (
                        <div key={facilityType.value} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`item_${index}_facility_${facilityType.value}`}
                            checked={item.displayFacilityTypes.includes(facilityType.value)}
                            onChange={() => toggleFacilityType(index, facilityType.value)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`item_${index}_facility_${facilityType.value}`}
                            className="ml-2 block text-sm text-gray-700"
                          >
                            {facilityType.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      選択した施設種別でのみこの項目を表示します（未選択の場合はすべての施設種別で表示）
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex justify-end gap-3">
          <Link
            href={`/templates/${params.id}`}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}
