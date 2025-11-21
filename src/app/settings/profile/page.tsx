'use client'

import { useEffect, useState } from 'react'

interface ProfileData {
  name: string
  email: string
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setError(null)
        const response = await fetch('/api/account/profile', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error('プロフィールの取得に失敗しました')
        }
        const data = (await response.json()) as ProfileData
        setProfile(data)
        setName(data.name || '')
      } catch (err) {
        console.error(err)
        setError('プロフィールの取得に失敗しました')
      }
    }
    fetchProfile()
  }, [])

  const handleSave = async () => {
    if (!name.trim()) {
      setError('氏名を入力してください')
      return
    }
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({
          error: 'プロフィールの更新に失敗しました',
        }))
        throw new Error(data.error || 'プロフィールの更新に失敗しました')
      }
      setSuccess('プロフィールを更新しました')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'プロフィールの更新に失敗しました'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordUpdate = async () => {
    setPasswordError(null)
    setPasswordSuccess(null)
    if (!currentPassword || !newPassword) {
      setPasswordError('現在のパスワードと新しいパスワードを入力してください')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('パスワードは8文字以上で設定してください')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('新しいパスワードが一致しません')
      return
    }

    setIsUpdatingPassword(true)
    try {
      const response = await fetch('/api/account/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'パスワードの更新に失敗しました')
      }

      setPasswordSuccess('パスワードを更新しました')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'パスワードの更新に失敗しました'
      setPasswordError(message)
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleEmailUpdate = async () => {
    setEmailError(null)
    setEmailSuccess(null)
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setEmailError('有効なメールアドレスを入力してください')
      return
    }
    if (!emailPassword) {
      setEmailError('現在のパスワードを入力してください')
      return
    }

    setIsUpdatingEmail(true)
    try {
      const response = await fetch('/api/account/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newEmail,
          password: emailPassword,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'メールアドレスの更新に失敗しました')
      }

      setEmailSuccess(
        data?.message ||
          'メールアドレスを更新しました。確認メールが送信される場合があります。'
      )
      setProfile((prev) =>
        prev ? { ...prev, email: data?.email || newEmail } : prev
      )
      setNewEmail('')
      setEmailPassword('')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'メールアドレスの更新に失敗しました'
      setEmailError(message)
    } finally {
      setIsUpdatingEmail(false)
    }
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-lg shadow p-6 min-h-[300px] flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">個人情報設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          表示名・パスワード・メールアドレスを更新できます。
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-3xl">
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              表示名
            </label>
            <input
              id="name"
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="mt-1 block w-full rounded-md border-gray-200 bg-gray-50 text-gray-500 shadow-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              メールアドレスの変更は下の「メールアドレス変更」から行えます。
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存する'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-3xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">パスワード変更</h2>
        {passwordError && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {passwordError}
          </div>
        )}
        {passwordSuccess && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
            {passwordSuccess}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              現在のパスワード
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              新しいパスワード
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              新しいパスワード（確認）
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-gray-500">
              安全のため8文字以上で設定してください。
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePasswordUpdate}
              disabled={isUpdatingPassword}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isUpdatingPassword ? '更新中...' : 'パスワードを変更'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-3xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">メールアドレス変更</h2>
        {emailError && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {emailError}
          </div>
        )}
        {emailSuccess && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
            {emailSuccess}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              新しいメールアドレス
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="new-user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              現在のパスワード
            </label>
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              autoComplete="current-password"
            />
            <p className="mt-1 text-xs text-gray-500">
              確認メールが送信される場合があります。入力したメールを確認してください。
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleEmailUpdate}
              disabled={isUpdatingEmail}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isUpdatingEmail ? '更新中...' : 'メールアドレスを変更'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
