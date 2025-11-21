'use client'

import { useEffect, useMemo, useState } from 'react'

type Role = 'inspector' | 'approver' | 'admin'

interface CurrentUser {
  role: string
}

interface OrgSettings {
  approval_levels: number
}

interface OrgUser {
  id: string
  name: string
  email: string
  role: Role
  approval_level: number | null
  is_active: boolean
  created_at: string
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'admin', label: '管理者' },
  { value: 'approver', label: '承認者' },
  { value: 'inspector', label: '確認担当' },
]

export default function UserManagementPage() {
  const [users, setUsers] = useState<OrgUser[]>([])
  const [orgApprovalLevels, setOrgApprovalLevels] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('inspector')
  const [inviteApprovalLevel, setInviteApprovalLevel] = useState(0)
  const [inviteResult, setInviteResult] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const meResponse = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!meResponse.ok) {
          setError('ログインが必要です')
          setIsLoading(false)
          return
        }
        const me = (await meResponse.json()) as CurrentUser
        const admin = me.role === 'admin'
        setIsAdmin(admin)
        if (!admin) {
          setError('ユーザー管理の権限がありません')
          setIsLoading(false)
          return
        }

        const [orgResponse, usersResponse] = await Promise.all([
          fetch('/api/organization/info', {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/organization/users', {
            credentials: 'include',
            cache: 'no-store',
          }),
        ])

        if (orgResponse.ok) {
          const org = (await orgResponse.json()) as OrgSettings
          setOrgApprovalLevels(org.approval_levels ?? 0)
        }

        const usersData = (await usersResponse.json().catch(() => null)) as
          | OrgUser[]
          | { error?: string }
          | null

        if (!usersResponse.ok || !Array.isArray(usersData)) {
          throw new Error(
            (usersData as { error?: string } | null)?.error ||
              'ユーザー一覧の取得に失敗しました'
          )
        }

        setUsers(usersData)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'ユーザー一覧の取得に失敗しました'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const maxApprovalLevel = useMemo(
    () => Math.max(0, Math.min(3, orgApprovalLevels)),
    [orgApprovalLevels]
  )

  useEffect(() => {
    setInviteApprovalLevel((prev) => Math.min(maxApprovalLevel, prev))
  }, [maxApprovalLevel])

  const updateUser = async (id: string, payload: Partial<OrgUser>) => {
    setError(null)
    try {
      const response = await fetch(`/api/organization/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'ユーザーの更新に失敗しました')
      }
      setUsers((prev) => prev.map((user) => (user.id === id ? data : user)))
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'ユーザーの更新に失敗しました'
      setError(message)
    }
  }

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    setInviteResult(null)
    setError(null)
    setIsInviting(true)
    try {
      const response = await fetch('/api/organization/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          role: inviteRole,
          approval_level: Math.min(maxApprovalLevel, inviteApprovalLevel),
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.user) {
        throw new Error(data?.error || 'ユーザーの招待に失敗しました')
      }

      setUsers((prev) => [...prev, data.user])
      setInviteResult(
        '招待メールを送信しました。受信者にメールの確認とパスワード設定を依頼してください。'
      )
      setInviteEmail('')
      setInviteName('')
      setInviteRole('inspector')
      setInviteApprovalLevel(0)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'ユーザーの招待に失敗しました'
      setError(message)
    } finally {
      setIsInviting(false)
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
        <h1 className="text-xl font-semibold text-gray-900 mb-2">ユーザー管理</h1>
        <p className="text-gray-600">
          ユーザー管理の権限がありません。管理者にお問い合わせください。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
        <p className="mt-2 text-sm text-gray-600">
          組織に所属するユーザーの招待、ロール変更、無効化を行います。
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {inviteResult && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <p>{inviteResult}</p>
        </div>
      )}

      <section className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">ユーザーを招待</h2>
            <p className="text-sm text-gray-500">
              メールアドレスを入力して新しいユーザーを追加します。初期パスワードは安全な方法で共有してください。
            </p>
          </div>
        </div>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleInvite}>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">氏名</label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="山田 太郎"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">ロール</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">承認レベル</label>
            <select
              value={inviteApprovalLevel}
              onChange={(e) =>
                setInviteApprovalLevel(Math.min(maxApprovalLevel, Number(e.target.value)))
              }
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {Array.from({ length: maxApprovalLevel + 1 }, (_, level) => (
                <option key={level} value={level}>
                  {level === 0 ? '0: 承認権限なし' : `${level}: 第${level}段階承認者`}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              組織の最大承認レベルは {maxApprovalLevel} 段階に設定されています。
            </p>
          </div>
          <div className="col-span-1 md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isInviting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isInviting ? '招待中...' : 'ユーザーを招待'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">ユーザー一覧</h2>
            <p className="text-sm text-gray-500">
              ロールや承認レベルの変更、アカウントの無効化を行えます。
            </p>
          </div>
        </div>

        {users.length === 0 ? (
          <p className="text-sm text-gray-500">ユーザーが登録されていません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    氏名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メール
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ロール
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    承認レベル
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-gray-500">
                        登録日: {new Date(user.created_at).toLocaleDateString('ja-JP')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <select
                        className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={user.role}
                        onChange={(e) =>
                          updateUser(user.id, {
                            role: e.target.value as Role,
                          })
                        }
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <select
                        className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={Math.min(maxApprovalLevel, user.approval_level ?? 0)}
                        onChange={(e) =>
                          updateUser(user.id, {
                            approval_level: Math.min(
                              maxApprovalLevel,
                              Number(e.target.value)
                            ),
                          })
                        }
                      >
                        {Array.from({ length: maxApprovalLevel + 1 }, (_, level) => (
                          <option key={level} value={level}>
                            {level === 0 ? '0: 承認権限なし' : `${level}: 第${level}段階承認者`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={user.is_active}
                          onChange={(e) =>
                            updateUser(user.id, { is_active: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={user.is_active ? 'text-green-600' : 'text-gray-400'}>
                          {user.is_active ? '有効' : '無効'}
                        </span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
