'use client'

import { useState } from 'react'

interface CreateOrgPayload {
  name: string
  plan: string
  adminName: string
  adminEmail: string
}

export default function SuperAdminOrganizationsPage() {
  const [form, setForm] = useState<CreateOrgPayload>({
    name: '',
    plan: 'free',
    adminName: '',
    adminEmail: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    organizationName: string
    adminEmail: string
    tempPassword: string
  } | null>(null)

  const handleChange = (field: keyof CreateOrgPayload, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/system/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          plan: form.plan,
          admin: {
            name: form.adminName,
            email: form.adminEmail,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({
          error: '組織の作成に失敗しました',
        }))
        throw new Error(data.error || '組織の作成に失敗しました')
      }

      const data = await response.json()
      setSuccess({
        organizationName: data.organization.name,
        adminEmail: data.admin.email,
        tempPassword: data.admin.tempPassword,
      })
      setForm({
        name: '',
        plan: 'free',
        adminName: '',
        adminEmail: '',
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '組織の作成に失敗しました'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">組織の新規作成</h1>
        <p className="mt-2 text-sm text-gray-600">
          システム管理者のみが利用できる機能です。組織名と初期管理者を登録すると、管理者アカウントが発行されます。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <p className="font-semibold">組織と管理者アカウントを作成しました。</p>
            <p className="mt-2">
              組織名: <span className="font-medium">{success.organizationName}</span>
            </p>
            <p>
              管理者: <span className="font-medium">{success.adminEmail}</span>
            </p>
            <p>
              仮パスワード: <span className="font-mono">{success.tempPassword}</span>
            </p>
            <p className="mt-1 text-xs text-gray-600">
              ※仮パスワードは必ず安全な方法で管理者に共有し、初回ログイン後に変更してもらってください。
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">組織名</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">プラン</label>
            <select
              value={form.plan}
              onChange={(e) => handleChange('plan', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="free">フリー</option>
              <option value="pro">プロ</option>
              <option value="business">ビジネス</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                管理者氏名
              </label>
              <input
                type="text"
                value={form.adminName}
                onChange={(e) => handleChange('adminName', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                管理者メールアドレス
              </label>
              <input
                type="email"
                value={form.adminEmail}
                onChange={(e) => handleChange('adminEmail', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? '作成中...' : '組織を作成'}
          </button>
        </div>
      </form>
    </div>
  )
}
