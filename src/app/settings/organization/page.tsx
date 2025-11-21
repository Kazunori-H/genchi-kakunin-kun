'use client'

import { useEffect, useMemo, useState, ChangeEvent } from 'react'

interface CurrentUser {
  role: string
}

interface OrganizationInfo {
  name: string
  plan: string
  approval_levels: number
  logo_url?: string | null
  settings?: Record<string, unknown> | null
}

interface OrganizationUser {
  id: string
  name: string
  email: string
  role: string
  approval_level: number | null
}

const MAX_APPROVAL_LEVEL = 3
const LEVEL_LABELS = ['0: 承認なし', '1: 1段階承認', '2: 2段階承認', '3: 3段階承認']
const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB

export default function OrganizationSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo | null>(null)
  const [orgName, setOrgName] = useState('')
  const [isSavingOrgInfo, setIsSavingOrgInfo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgMessage, setOrgMessage] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [logoMessage, setLogoMessage] = useState<string | null>(null)

  const [approvalLevel, setApprovalLevel] = useState(0)
  const [initialApprovalLevel, setInitialApprovalLevel] = useState(0)
  const [users, setUsers] = useState<OrganizationUser[]>([])
  const [initialUserLevels, setInitialUserLevels] = useState<Record<string, number>>({})
  const [isSavingOrgLevel, setIsSavingOrgLevel] = useState(false)
  const [isSavingUsers, setIsSavingUsers] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)
        const meResponse = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (meResponse.status === 401) {
          setError('ログインが必要です')
          setIsLoading(false)
          return
        }
        const me = (await meResponse.json()) as CurrentUser
        const admin = me.role === 'admin'
        setIsAdmin(admin)

        const orgResponse = await fetch('/api/organization/info', {
          credentials: 'include',
          cache: 'no-store',
        })
        let baseApprovalLevel = 0
        if (orgResponse.ok) {
          const data = (await orgResponse.json()) as OrganizationInfo
          setOrgInfo(data)
          setOrgName(data.name || '')
          setLogoUrl(data.logo_url || null)
          baseApprovalLevel = data.approval_levels ?? 0
          setApprovalLevel(baseApprovalLevel)
          setInitialApprovalLevel(baseApprovalLevel)
        }

        if (admin) {
          const [settingsResponse, usersResponse] = await Promise.all([
            fetch('/api/organization/approval-settings'),
            fetch('/api/organization/approvers'),
          ])

          if (settingsResponse.ok) {
            const settingsData = (await settingsResponse.json()) as {
              approval_levels: number
            }
            const normalizedLevel = clampApprovalLevel(
              settingsData.approval_levels ?? baseApprovalLevel
            )
            setApprovalLevel(normalizedLevel)
            setInitialApprovalLevel(normalizedLevel)
          }

          if (usersResponse.ok) {
            const usersData = (await usersResponse.json()) as OrganizationUser[]
            const normalizedUsers = usersData.map((user) => ({
              ...user,
              approval_level: user.approval_level ?? 0,
            }))
            setUsers(normalizedUsers)
            setInitialUserLevels(
              Object.fromEntries(
                normalizedUsers.map((user) => [user.id, user.approval_level ?? 0])
              )
            )
          }
        }
      } catch (err) {
        console.error('Failed to fetch organization settings', err)
        setError('組織設定の読み込みに失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl)
      }
    }
  }, [logoPreviewUrl])

  const hasOrgChanges = approvalLevel !== initialApprovalLevel
  const hasUserChanges = useMemo(() => {
    return users.some((user) => {
      const initial = initialUserLevels[user.id] ?? 0
      const current = user.approval_level ?? 0
      return initial !== current
    })
  }, [users, initialUserLevels])

  const handleOrgInfoSave = async () => {
    if (!orgName.trim()) {
      setOrgMessage('組織名を入力してください')
      return
    }
    setIsSavingOrgInfo(true)
    setOrgMessage(null)
    try {
      const response = await fetch('/api/organization/info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: orgName }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({
          error: '組織情報の更新に失敗しました',
        }))
        throw new Error(data.error || '組織情報の更新に失敗しました')
      }
      setOrgMessage('組織情報を更新しました')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '組織情報の更新に失敗しました'
      setOrgMessage(message)
    } finally {
      setIsSavingOrgInfo(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setLogoMessage('画像ファイルを選択してください')
      return
    }
    if (file.size > MAX_LOGO_SIZE) {
      setLogoMessage('ファイルサイズは2MBまでです')
      return
    }

    setIsUploadingLogo(true)
    setLogoMessage(null)
    const previewUrl = URL.createObjectURL(file)
    setLogoPreviewUrl(previewUrl)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/organization/logo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.logoUrl) {
        throw new Error(data?.error || 'ロゴのアップロードに失敗しました')
      }

      setLogoUrl(data.logoUrl)
      setLogoMessage('ロゴを更新しました')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'ロゴのアップロードに失敗しました'
      setLogoMessage(message)
      setLogoPreviewUrl(null)
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleLogoDelete = async () => {
    setIsUploadingLogo(true)
    setLogoMessage(null)
    try {
      const response = await fetch('/api/organization/logo', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'ロゴの削除に失敗しました')
      }

      setLogoUrl(null)
      setLogoPreviewUrl(null)
      setLogoMessage('ロゴを削除しました')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'ロゴの削除に失敗しました'
      setLogoMessage(message)
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleLogoInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      void handleLogoUpload(file)
    }
  }

  const handleApprovalLevelSelection = (level: number) => {
    const normalized = clampApprovalLevel(level)
    setUsers((prev) =>
      prev.map((user) =>
        (user.approval_level ?? 0) > normalized
          ? { ...user, approval_level: normalized }
          : user
      )
    )
    setApprovalLevel(normalized)
  }

  const handleSaveApprovalLevel = async () => {
    setIsSavingOrgLevel(true)
    setError(null)
    try {
      const response = await fetch('/api/organization/approval-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approval_levels: approvalLevel }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({
          error: '承認レベルの更新に失敗しました',
        }))
        throw new Error(data.error || '承認レベルの更新に失敗しました')
      }

      setInitialApprovalLevel(approvalLevel)
      setInitialUserLevels(
        Object.fromEntries(
          users.map((user) => [user.id, user.approval_level ?? 0])
        )
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '承認レベルの更新に失敗しました'
      setError(message)
    } finally {
      setIsSavingOrgLevel(false)
    }
  }

  const handleUserLevelChange = (userId: string, level: number) => {
    const safeLevel = Math.max(0, Math.min(approvalLevel, Math.floor(level)))
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, approval_level: safeLevel } : user
      )
    )
  }

  const handleSaveUserLevels = async () => {
    setIsSavingUsers(true)
    setError(null)
    try {
      const response = await fetch('/api/organization/approvers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          users: users.map((user) => ({
            id: user.id,
            approval_level: user.approval_level ?? 0,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({
          error: 'ユーザー承認レベルの更新に失敗しました',
        }))
        throw new Error(data.error || 'ユーザー承認レベルの更新に失敗しました')
      }

      setInitialUserLevels(
        Object.fromEntries(
          users.map((user) => [user.id, user.approval_level ?? 0])
        )
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'ユーザー承認レベルの更新に失敗しました'
      setError(message)
    } finally {
      setIsSavingUsers(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">組織設定</h1>
        <p className="text-gray-600">
          組織設定の変更権限がありません。管理者にお問い合わせください。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">組織設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          組織情報の管理と承認フローの設定を行います。
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="bg-white shadow rounded-lg p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">組織情報</h2>
            <p className="text-sm text-gray-500">
              組織名とプラン情報を確認・編集できます。
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">
              組織名
            </label>
            <input
              id="orgName"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">利用プラン</label>
            <p className="mt-1 text-sm text-gray-900">
              {orgInfo?.plan === 'free' ? 'フリープラン' : orgInfo?.plan || '不明'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">組織ロゴ</label>
            <div className="mt-2 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                {logoPreviewUrl || logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreviewUrl ?? logoUrl ?? ''}
                    alt="組織ロゴ"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-400">No Logo</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="organization-logo"
                    className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isUploadingLogo ? 'アップロード中...' : 'ロゴをアップロード'}
                  </label>
                  <input
                    id="organization-logo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoInputChange}
                    disabled={isUploadingLogo}
                  />
                  <button
                    type="button"
                    onClick={handleLogoDelete}
                    disabled={isUploadingLogo || (!logoUrl && !logoPreviewUrl)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                  >
                    ロゴを削除
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  2MB以下の画像（PNG/JPEG/SVG）をアップロードできます。
                </p>
                {logoMessage && (
                  <p className="text-xs text-indigo-600">{logoMessage}</p>
                )}
              </div>
            </div>
          </div>
          {orgMessage && (
            <div className="text-sm text-indigo-600">{orgMessage}</div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleOrgInfoSave}
              disabled={isSavingOrgInfo}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSavingOrgInfo ? '保存中...' : '組織情報を保存'}
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">承認レベル</h2>
            <p className="text-sm text-gray-500">
              最大3段階まで設定できます。設定した段階まで承認者を割り当てできます。
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            disabled={!hasOrgChanges || isSavingOrgLevel}
            onClick={handleSaveApprovalLevel}
          >
            {isSavingOrgLevel ? '保存中...' : '承認レベルを保存'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: MAX_APPROVAL_LEVEL + 1 }, (_, level) => (
            <label
              key={level}
              className={`border rounded-lg p-4 cursor-pointer transition ${
                approvalLevel === level
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <input
                type="radio"
                name="approval-level"
                className="sr-only"
                checked={approvalLevel === level}
                onChange={() => handleApprovalLevelSelection(level)}
              />
              <p className="text-sm font-semibold text-gray-900">
                {LEVEL_LABELS[level]}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {level === 0
                  ? '承認フローなし'
                  : `${level}名の承認者が順番に承認します`}
              </p>
            </label>
          ))}
        </div>
        {hasOrgChanges && (
          <p className="mt-3 text-xs text-gray-500">
            変更内容を適用するには「承認レベルを保存」をクリックしてください。
          </p>
        )}
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">承認者の割り当て</h2>
            <p className="text-sm text-gray-500">
              各ユーザーの承認権限レベルを設定します。0は承認権限なしを意味します。
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            disabled={!hasUserChanges || isSavingUsers}
            onClick={handleSaveUserLevels}
          >
            {isSavingUsers ? '保存中...' : '承認権限を保存'}
          </button>
        </div>

        {users.length === 0 ? (
          <p className="text-sm text-gray-500">組織に登録されているユーザーがいません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    氏名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メールアドレス
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ロール
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    承認レベル
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.role}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <select
                        className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={Math.min(approvalLevel, user.approval_level ?? 0)}
                        onChange={(e) => handleUserLevelChange(user.id, Number(e.target.value))}
                      >
                        {Array.from({ length: approvalLevel + 1 }, (_, level) => (
                          <option key={level} value={level}>
                            {level === 0 ? '0: 承認権限なし' : `${level}: 第${level}段階承認者`}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {approvalLevel === 0 && (
          <p className="mt-4 text-xs text-gray-500">
            承認レベルが0に設定されているため、すべてのユーザーの承認権限は無効化されています。
          </p>
        )}
        {hasUserChanges && (
          <p className="mt-3 text-xs text-gray-500">
            変更内容を適用するには「承認権限を保存」をクリックしてください。
          </p>
        )}
      </section>
    </div>
  )
}

function clampApprovalLevel(value: number) {
  return Math.max(0, Math.min(MAX_APPROVAL_LEVEL, Math.floor(value ?? 0)))
}
